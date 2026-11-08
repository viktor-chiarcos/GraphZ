"""Writer for the legacy ``.gphz`` format.

The output mirrors the layout produced by the original Windows application:

* CRLF line endings;
* one field per line, no indentation;
* project metadata first, then blocks;
* the final ``]`` is not followed by a newline.

Values are written with :func:`json.dumps`, so text containing quotes, raw
newlines or non-ASCII characters is always emitted as valid JSON.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .model import Project

NEWLINE = "\r\n"


def dump(project: Project, path: str | Path) -> None:
    """Serialize ``project`` to ``path`` as valid UTF-8 ``.gphz``."""

    data = dumps(project)
    Path(path).write_bytes(data.encode("utf-8"))


def dumps(project: Project, *, newline: str = NEWLINE) -> str:
    """Return ``project`` serialized in the legacy top-level array shape."""

    objects = [dict(project.metadata), *(block.as_dict() for block in project.blocks)]
    return "[" + newline + ("," + newline).join(
        _format_object(obj, newline) for obj in objects
    ) + newline + "]"


def _format_object(obj: dict[str, Any], newline: str) -> str:
    if not obj:
        return "{}"
    lines = [
        f"{json.dumps(str(key), ensure_ascii=False)}: {_format_value(value)}"
        for key, value in obj.items()
    ]
    return "{" + newline + ("," + newline).join(lines) + newline + "}"


def _format_value(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)
