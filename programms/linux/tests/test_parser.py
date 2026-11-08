"""Tests for the tolerant .gphz parser and the model."""

from __future__ import annotations

from pathlib import Path

import pytest

from graphz.model import Block, Project
from graphz.parser import ParseError, load, loads, repair_json_text
from graphz.serializer import dumps

REPO_ROOT = Path(__file__).resolve().parents[3]
EXAMPLES = sorted(
    path
    for path in REPO_ROOT.rglob("*.gphz")
    if "programms/wine" not in path.as_posix()
)

MALFORMED = {
    "komando_licht_hallo_opa.gphz",
    "template_arduino_light_mini_text_for_graphviz.gphz",
    "beispiel_arduino-light.gphz",
}

assert len(EXAMPLES) == 40, f"expected 40 examples, found {len(EXAMPLES)}"


def test_examples_are_discovered():
    names = {path.name for path in EXAMPLES}
    assert MALFORMED <= names


@pytest.mark.parametrize("path", EXAMPLES, ids=lambda p: p.name)
def test_every_example_parses(path: Path):
    project = load(path)

    assert project.metadata, "project metadata must not be empty"
    assert project.scheme_id is not None
    assert project.scheme_mode in {"Newbie", "Expert"}
    assert project.blocks, "project must contain at least one block"
    assert all(block.block_type for block in project.blocks)


@pytest.mark.parametrize("path", EXAMPLES, ids=lambda p: p.name)
def test_every_example_round_trips(path: Path):
    original = load(path)
    reparsed = loads(dumps(original), path=str(path))

    assert reparsed.metadata == original.metadata
    assert len(reparsed.blocks) == len(original.blocks)
    assert reparsed.as_list() == original.as_list()


@pytest.mark.parametrize("path", EXAMPLES, ids=lambda p: p.name)
def test_every_example_has_a_consistent_graph(path: Path):
    report = load(path).validate()
    assert report.ok, report


def test_unknown_fields_are_preserved():
    project = loads(
        '[{"SchemeId": "1", "SchemeMode": "Expert", "FutureMeta": "x"},'
        '{"BlockType": "Lamp", "BlockConnectionTag": "L1",'
        '"FutureBlockField": "42"}]'
    )
    assert project.metadata["FutureMeta"] == "x"
    assert project.blocks[0].get("FutureBlockField") == "42"
    assert loads(dumps(project)).as_list() == project.as_list()


def test_duplicate_and_missing_tags_are_reported():
    project = Project(
        metadata={"SchemeId": "1", "SchemeMode": "Expert"},
        blocks=[
            Block({"BlockType": "Start", "BlockConnectionTag": "S"}),
            Block({"BlockType": "Lamp", "BlockConnectionTag": "S"}),
            Block({"BlockType": "Lamp"}),
        ],
    )
    report = project.validate()
    assert report.duplicate_tags == {"S": [0, 1]}
    assert report.missing_tags == [2]
    assert not report.ok


def test_dangling_output_and_cycle_detection():
    project = Project(
        metadata={"SchemeId": "1", "SchemeMode": "Expert"},
        blocks=[
            Block({"BlockType": "Start", "BlockConnectionTag": "S",
                   "OutputLine": "A"}),
            Block({"BlockType": "Lamp", "BlockConnectionTag": "A",
                   "OutputLine": "B"}),
            Block({"BlockType": "Timer", "BlockConnectionTag": "B",
                   "OutputLine": "A"}),
            Block({"BlockType": "Lamp", "BlockConnectionTag": "X",
                   "OutputLine": "missing"}),
        ],
    )
    report = project.validate()
    assert report.dangling_outputs == [(3, "missing")]
    assert report.cyclic_tags == ["A", "B"]


def test_self_loop_is_detected_but_valid():
    project = Project(
        metadata={},
        blocks=[Block({"BlockType": "Lamp", "BlockConnectionTag": "L",
                       "OutputLine": "L"})],
    )
    report = project.validate()
    assert report.self_loops == [0]
    assert report.ok  # a self-loop means "repeat", not corruption


def test_pair_block_self_reference_is_a_loop():
    project = Project(
        metadata={},
        blocks=[Block({"BlockType": "PairBlock", "BlockConnectionTag": "P",
                       "OutputLine": "P"})],
    )
    report = project.validate()
    assert report.self_loops == [0]
    assert report.cyclic_tags == ["P"]


# -- tolerant repair ------------------------------------------------------


def test_raw_newlines_and_unescaped_quotes_are_repaired():
    text = (
        '[\r\n{"SchemeId": "1"},\r\n'
        '{"BlockType": "LEDMatrixText", "SubParams": '
        '"255,255,255;375; graphviz("Text")\r\n## comment\r\n;",'
        '"RealCoordsX": "1"}\r\n]'
    )
    project = loads(text)
    sub_params = project.blocks[0].sub_params
    assert sub_params is not None
    assert 'graphviz("Text")' in sub_params
    assert "\n## comment" in sub_params


def test_invalid_backslash_escape_is_preserved():
    text = '[{"BlockType": "LEDMatrixText", "SubParams": "a\\END--;"}]'
    # The Python literal above is the JSON text: "a\END--;"
    project = loads(text)
    assert project.blocks[0].sub_params == "a\\END--;"


def test_bom_is_accepted():
    project = loads("\ufeff" + '[{"SchemeId": "1", "SchemeMode": "Expert"}]')
    assert project.scheme_id == "1"


def test_non_array_is_rejected():
    with pytest.raises(ParseError):
        loads('{"SchemeId": "1"}')


def test_non_object_element_is_rejected():
    with pytest.raises(ParseError):
        loads('[{"SchemeId": "1"}, 2]')


def test_unrecoverable_text_raises():
    with pytest.raises(ParseError):
        loads('[{"SchemeId": "1"}')


def test_repair_is_idempotent_for_valid_json():
    valid = dumps(Project(metadata={"SchemeId": "1"},
                          blocks=[Block({"BlockType": "Lamp"})]))
    assert repair_json_text(valid) == valid


# -- malformed corpus specifics ------------------------------------------


def test_hallo_opa_cyrillic_newline_survives():
    project = load(REPO_ROOT / "komando_licht_hallo_opa.gphz")
    block = next(
        block for block in project.blocks
        if block.block_type == "LEDMatrixText"
    )
    assert block.sub_params is not None
    assert "Привет Дедушка!\nHALLO OPA!;" in block.sub_params


def test_graphviz_quotes_and_comments_survive():
    project = load(
        REPO_ROOT / "template_arduino_light_mini_text_for_graphviz.gphz"
    )
    block = next(
        block for block in project.blocks
        if block.block_type == "LEDMatrixText"
    )
    assert block.sub_params is not None
    assert 'graphviz("Benutzerdefinierter Text")' in block.sub_params
    assert "## -- COMMENT --" in block.sub_params
    assert block.sub_params.endswith(";")
