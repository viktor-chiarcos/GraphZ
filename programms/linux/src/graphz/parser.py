"""Tolerant reader for the legacy ``.gphz`` format.

A ``.gphz`` file is a JSON array. The first object is project metadata and the
remaining objects are blocks. Real-world files break strict JSON in a handful
of ways:

* UTF-8 BOM;
* raw CR/LF and other control characters inside string values;
* unescaped double quotes inside string values (for example a GraphViz
  expression embedded in ``SubParams``);
* invalid backslash escapes such as ``\\END``;
* trailing comments or arbitrary text inside ``SubParams``.

The parser first tries strict JSON, then repairs only the string-literal layer
and retries. It never silently drops a top-level object: anything that cannot be
decoded raises :class:`ParseError`.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .model import Block, Project, is_scheme_object

_VALID_ESCAPES = {'"', "\\", "/", "b", "f", "n", "r", "t"}
_HEX_DIGITS = set("0123456789abcdefABCDEF")


class ParseError(ValueError):
    """Raised when a ``.gphz`` file cannot be read even with repair."""

    def __init__(self, message: str, *, path: str | None = None,
                 cause: Exception | None = None) -> None:
        self.path = path
        self.cause = cause
        location = f"{path}: " if path else ""
        super().__init__(location + message)


def load(path: str | Path) -> Project:
    """Read and parse a ``.gphz`` file."""

    path = Path(path)
    try:
        raw = path.read_bytes()
    except OSError as exc:
        raise ParseError(f"cannot read file: {exc}", path=str(path), cause=exc) from exc

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ParseError(f"not valid UTF-8: {exc}", path=str(path), cause=exc) from exc

    return loads(text, path=str(path))


def loads(text: str, *, path: str | None = None) -> Project:
    """Parse ``.gphz`` text.

    ``path`` is only used in error messages and stored on the result as
    ``source_path``.
    """

    if text.startswith("\ufeff"):
        text = text[1:]

    try:
        data = json.loads(text)
    except json.JSONDecodeError as first_error:
        repaired = repair_json_text(text)
        try:
            data = json.loads(repaired)
        except json.JSONDecodeError as second_error:
            raise ParseError(
                "invalid JSON even after tolerant repair: "
                f"{second_error.msg} at line {second_error.lineno} "
                f"column {second_error.colno}",
                path=path,
                cause=first_error,
            ) from second_error

    return from_data(data, path=path)


def from_data(data: Any, *, path: str | None = None) -> Project:
    """Build a :class:`Project` from already-decoded JSON data."""

    if not isinstance(data, list):
        raise ParseError(
            f"top-level value must be an array, got {type(data).__name__}",
            path=path,
        )

    metadata: dict[str, Any] = {}
    blocks: list[Block] = []

    for index, item in enumerate(data):
        if not isinstance(item, dict):
            raise ParseError(
                f"array element {index} must be an object, "
                f"got {type(item).__name__}",
                path=path,
            )
        if is_scheme_object(item):
            metadata.update(item)
        else:
            blocks.append(Block(dict(item)))

    return Project(metadata=metadata, blocks=blocks, source_path=path)


def repair_json_text(text: str) -> str:
    """Repair ``.gphz`` string literals without changing the JSON structure.

    The repair is intentionally conservative:

    * a quote is treated as the end of a string only when the following
      significant character can legally follow a string in JSON (``,``, ``}``,
      ``]`` or ``:``);
    * raw control characters inside strings are escaped;
    * unknown backslash escapes are turned into literal backslashes.

    This is not a general JSON5 parser. It exists to recover the known GraphZ
    writer bugs and is covered by tests for every file in the repository.
    """

    out: list[str] = []
    in_string = False
    i = 0
    length = len(text)

    while i < length:
        char = text[i]

        if not in_string:
            out.append(char)
            if char == '"':
                in_string = True
            i += 1
            continue

        if char == "\\":
            nxt = text[i + 1] if i + 1 < length else ""
            if nxt == "u" and _is_hex(text, i + 2, 4):
                out.append(text[i : i + 6])
                i += 6
            elif nxt in _VALID_ESCAPES and nxt:
                out.append(text[i : i + 2])
                i += 2
            else:
                # Preserve a literal backslash rather than rejecting the file.
                out.append("\\\\")
                i += 1
            continue

        if char == '"':
            if _ends_string(text, i):
                out.append('"')
                in_string = False
            else:
                out.append('\\"')
            i += 1
            continue

        out.append(_escape_control(char))
        i += 1

    return "".join(out)


def _ends_string(text: str, quote_index: int) -> bool:
    """Decide whether the quote at ``quote_index`` closes a JSON string."""

    j = _next_significant(text, quote_index + 1)
    if j >= len(text):
        return True

    following = text[j]
    if following in "}]:":  # value or key terminator
        return True
    if following == ",":
        k = _next_significant(text, j + 1)
        if k >= len(text):
            return False  # a trailing comma is not a legal terminator
        # A closing value is followed by the next key/element.
        return text[k] in '"{['
    return False


def _next_significant(text: str, index: int) -> int:
    while index < len(text) and text[index] in " \t\r\n":
        index += 1
    return index


def _is_hex(text: str, start: int, count: int) -> bool:
    chunk = text[start : start + count]
    return len(chunk) == count and all(char in _HEX_DIGITS for char in chunk)


def _escape_control(char: str) -> str:
    code = ord(char)
    if code >= 0x20:
        return char
    if char == "\n":
        return "\\n"
    if char == "\r":
        return "\\r"
    if char == "\t":
        return "\\t"
    return f"\\u{code:04x}"
