"""Command line entry point.

Only the commands needed by the first implementation increment are present.
Compile/upload commands arrive with the ``arduino-cli`` integration.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import __version__
from .parser import ParseError, load
from .serializer import dump


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="graphz", description=__doc__)
    parser.add_argument("--version", action="version", version=__version__)
    sub = parser.add_subparsers(dest="command", required=True)

    info = sub.add_parser("info", help="show project metadata and block counts")
    info.add_argument("project", type=Path)

    validate = sub.add_parser("validate", help="check graph structure")
    validate.add_argument("project", type=Path)

    convert = sub.add_parser(
        "convert", help="load a project and write a repaired, valid .gphz"
    )
    convert.add_argument("project", type=Path)
    convert.add_argument("output", type=Path)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    try:
        project = load(args.project)
    except ParseError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if args.command == "info":
        print(f"file:    {args.project}")
        print(f"kit id:  {project.scheme_id}")
        print(f"mode:    {project.scheme_mode}")
        print(f"blocks:  {len(project.blocks)}")
        return 0

    if args.command == "validate":
        report = project.validate()
        if report.ok:
            print("ok")
            if report.self_loops:
                print(f"repeats (self loops): {report.self_loops}")
            if report.cyclic_tags:
                print(f"cycles: {report.cyclic_tags}")
            return 0
        if report.missing_tags:
            print(f"blocks without tag: {report.missing_tags}")
        if report.duplicate_tags:
            print(f"duplicate tags: {report.duplicate_tags}")
        if report.dangling_outputs:
            print(f"dangling outputs: {report.dangling_outputs}")
        if report.self_loops:
            print(f"self loops: {report.self_loops}")
        return 1

    if args.command == "convert":
        dump(project, args.output)
        print(f"wrote {args.output}")
        return 0

    return 1


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
