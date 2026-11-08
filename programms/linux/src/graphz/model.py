"""In-memory model for a GraphZ project.

The model deliberately keeps every observed field as an opaque value. GraphZ
stores almost everything as strings (including the literal string ``"null"``),
and unknown fields must survive a load/save round-trip, so the model does not
normalise values on read.

Known field names live here as constants and are exposed through small typed
helpers. Everything else stays in :attr:`Block.fields`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterator

SCHEME_ID = "SchemeId"
SCHEME_MODE = "SchemeMode"

BLOCK_TYPE = "BlockType"
TAG = "BlockConnectionTag"
OUTPUT_LINE = "OutputLine"
OUTPUT_FROM_ORIENTATION = "OutputLineFromOrientation"
OUTPUT_TO_ORIENTATION = "OutputLineToOrientation"
DIAMOND_BLOCK = "DiamondBlock"
ITERATIONS_PAIR_BLOCK = "IterationsPairBlock"
CHOSEN_ACTION_INDEX = "ChosenActionIndex"
MASKED_TEXT_BOX_VALUE = "MaskedTextBoxValue"
ACTION_OPTION_VALUE = "ActionOptionValue"
SUB_PARAMS = "SubParams"
REAL_COORDS_X = "RealCoordsX"
REAL_COORDS_Y = "RealCoordsY"

_SCHEME_FIELDS = {SCHEME_ID, SCHEME_MODE}

# The two modes observed in the example corpus. Kept as plain strings because
# a future kit may add another mode.
SCHEME_MODES = ("Newbie", "Expert")


def is_null(value: Any) -> bool:
    """Return true for both JSON null and GraphZ's literal ``"null"`` string."""

    return value is None or value == "null"


@dataclass
class Block:
    """One block in a project.

    ``fields`` preserves insertion order and every unknown field. Use the
    properties for the documented fields and :meth:`get`/:meth:`set` for
    everything else.
    """

    fields: dict[str, Any] = field(default_factory=dict)

    # -- generic access -------------------------------------------------

    def get(self, name: str, default: Any = None) -> Any:
        return self.fields.get(name, default)

    def set(self, name: str, value: Any) -> None:
        self.fields[name] = value

    def __contains__(self, name: str) -> bool:
        return name in self.fields

    # -- documented fields ----------------------------------------------

    @property
    def block_type(self) -> str | None:
        return _as_text(self.fields.get(BLOCK_TYPE))

    @property
    def tag(self) -> str | None:
        return _as_text(self.fields.get(TAG))

    @property
    def output_line(self) -> str | None:
        return _as_text(self.fields.get(OUTPUT_LINE))

    @output_line.setter
    def output_line(self, value: str | None) -> None:
        self.fields[OUTPUT_LINE] = "null" if value is None else value

    @property
    def chosen_action_index(self) -> str | None:
        return _as_text(self.fields.get(CHOSEN_ACTION_INDEX))

    @property
    def sub_params(self) -> str | None:
        return _as_text(self.fields.get(SUB_PARAMS))

    @property
    def iterations(self) -> str | None:
        return _as_text(self.fields.get(ITERATIONS_PAIR_BLOCK))

    # -- conversion ------------------------------------------------------

    def as_dict(self) -> dict[str, Any]:
        """Return a shallow copy suitable for serialization."""

        return dict(self.fields)

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"Block({self.block_type!r}, tag={self.tag!r})"


@dataclass
class ValidationReport:
    """Structural checks that do not require circuit specifications.

    These are only the checks that can be made from the file alone. Pin maps,
    action indices and code generation semantics are validated later against
    the circuit profiles.
    """

    missing_tags: list[int] = field(default_factory=list)
    duplicate_tags: dict[str, list[int]] = field(default_factory=dict)
    dangling_outputs: list[tuple[int, str]] = field(default_factory=list)
    self_loops: list[int] = field(default_factory=list)
    cyclic_tags: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        # Cycles and self-loops are valid GraphZ semantics ("repeat"). Only
        # broken references and duplicate/missing tags are structural errors.
        return not (
            self.missing_tags
            or self.duplicate_tags
            or self.dangling_outputs
        )

    def raise_for_errors(self) -> None:
        if self.ok:
            return
        problems: list[str] = []
        if self.missing_tags:
            problems.append(f"blocks without a tag: {self.missing_tags}")
        if self.duplicate_tags:
            problems.append(f"duplicate tags: {self.duplicate_tags}")
        if self.dangling_outputs:
            problems.append(f"dangling outputs: {self.dangling_outputs}")
        raise ValueError("; ".join(problems))


@dataclass
class Project:
    """A parsed ``.gphz`` project.

    ``metadata`` holds the leading non-block object(s). GraphZ currently writes
    only ``SchemeId`` and ``SchemeMode``; unknown metadata fields are preserved
    too. ``source_path`` is advisory and never serialized.
    """

    metadata: dict[str, Any] = field(default_factory=dict)
    blocks: list[Block] = field(default_factory=list)
    source_path: str | None = field(default=None, compare=False, repr=False)

    # -- metadata --------------------------------------------------------

    @property
    def scheme_id(self) -> str | None:
        return _as_text(self.metadata.get(SCHEME_ID))

    @property
    def scheme_mode(self) -> str | None:
        return _as_text(self.metadata.get(SCHEME_MODE))

    @property
    def mode(self) -> str | None:
        return self.scheme_mode

    # -- block access ----------------------------------------------------

    def __len__(self) -> int:
        return len(self.blocks)

    def __iter__(self) -> Iterator[Block]:
        return iter(self.blocks)

    def __getitem__(self, index: int) -> Block:
        return self.blocks[index]

    def block_by_tag(self, tag: str) -> Block | None:
        for block in self.blocks:
            if block.tag == tag:
                return block
        return None

    def tags(self) -> list[str | None]:
        return [block.tag for block in self.blocks]

    def add_block(self, block: Block) -> None:
        self.blocks.append(block)

    # -- validation ------------------------------------------------------

    def validate(self) -> ValidationReport:
        report = ValidationReport()
        seen: dict[str, list[int]] = {}

        for index, block in enumerate(self.blocks):
            tag = block.tag
            if tag is None:
                report.missing_tags.append(index)
            else:
                seen.setdefault(tag, []).append(index)

        report.duplicate_tags = {
            tag: indexes for tag, indexes in seen.items() if len(indexes) > 1
        }

        for index, block in enumerate(self.blocks):
            target = block.output_line
            if target is None:
                continue
            if target == block.tag:
                report.self_loops.append(index)
            elif target not in seen:
                report.dangling_outputs.append((index, target))

        report.cyclic_tags = self._find_cycle_tags()
        return report

    def _find_cycle_tags(self) -> list[str]:
        """Return tags that participate in at least one cycle (best effort)."""

        by_tag = {block.tag: block for block in self.blocks if block.tag}
        colour: dict[str, int] = {}  # 0 = unvisited, 1 = in stack, 2 = done
        cyclic: set[str] = set()
        stack: list[str] = []

        def visit(tag: str) -> None:
            colour[tag] = 1
            stack.append(tag)
            target = by_tag[tag].output_line
            if target in by_tag:
                state = colour.get(target, 0)
                if state == 1:
                    start = stack.index(target)
                    cyclic.update(stack[start:])
                elif state == 0:
                    visit(target)
            stack.pop()
            colour[tag] = 2

        for tag in by_tag:
            if colour.get(tag, 0) == 0:
                visit(tag)

        return sorted(cyclic)

    def as_list(self) -> list[dict[str, Any]]:
        """Return the legacy top-level JSON array shape."""

        return [dict(self.metadata), *(block.as_dict() for block in self.blocks)]


def _as_text(value: Any) -> str | None:
    """GraphZ stores scalars as strings; treat ``"null"`` as absent."""

    if value is None or value == "null":
        return None
    if isinstance(value, str):
        return value
    return str(value)


def is_scheme_object(obj: dict[str, Any]) -> bool:
    """True when an object looks like project metadata rather than a block."""

    if BLOCK_TYPE in obj:
        return False
    return bool(_SCHEME_FIELDS.intersection(obj))
