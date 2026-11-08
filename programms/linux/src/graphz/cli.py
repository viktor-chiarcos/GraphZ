#!/usr/bin/env python3
"""Command line entry point for GraphZ Linux port."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

# Ensure arduino-cli is on PATH
os.environ["PATH"] = "/tmp/bin:" + os.environ.get("PATH", "")

from graphz import __version__
from graphz.parser import ParseError, load
from graphz.serializer import dumps, dump
from graphz.codegen.emit import emit_from_project


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="graphz", description="GraphZ Linux port CLI")
    parser.add_argument("--version", action="version", version=__version__)
    sub = parser.add_subparsers(dest="command", required=True)

    # info
    info = sub.add_parser("info", help="show project metadata and block counts")
    info.add_argument("project", type=Path)

    # validate
    validate = sub.add_parser("validate", help="check graph structure")
    validate.add_argument("project", type=Path)

    # convert
    convert = sub.add_parser("convert", help="load and write repaired .gphz")
    convert.add_argument("project", type=Path)
    convert.add_argument("output", type=Path)

    # generate
    generate = sub.add_parser("generate", help="generate Arduino C++ sketch from .gphz")
    generate.add_argument("project", type=Path)
    generate.add_argument(
        "--output", "-o", type=Path, default=Path(".sketch"),
        help="Output directory (default: ./sketch)",
    )

    # compile
    compile_cmd = sub.add_parser("compile", help="compile generated sketch with arduino-cli")
    compile_cmd.add_argument(
        "--bootloader",
        choices=["new", "old"],
        default="old",
        help="Arduino Nano bootloader variant (default: old)",
    )

    # upload
    upload_cmd = sub.add_parser("upload", help="upload compiled sketch to Nano")
    upload_cmd.add_argument(
        "--port",
        default=None,
        help="Serial port (default: auto-detect /dev/ttyUSB0)",
    )
    upload_cmd.add_argument(
        "--bootloader",
        choices=["new", "old"],
        default="old",
        help="Arduino Nano bootloader variant (default: old)",
    )

    # ports
    ports_cmd = sub.add_parser("ports", help="list available serial ports")

    return parser


def auto_detect_port() -> str | None:
    """Auto-detect the most likely Arduino Nano port."""
    import glob
    ports = glob.glob("/dev/ttyUSB*") + glob.glob("/dev/ttyACM*")
    if ports:
        return ports[0]
    return None


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    project = None

    if args.command == "info":
        project = load(args.project)
        print(f"file:    {args.project}")
        print(f"kit id:  {project.scheme_id}")
        print(f"mode:    {project.scheme_mode}")
        print(f"blocks:  {len(project.blocks)}")
        return 0

    if args.command == "validate":
        project = load(args.project)
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
        project = load(args.project)
        dump(project, args.output)
        print(f"wrote {args.output}")
        return 0

    if args.command == "generate":
        project = load(args.project)
        sketch = emit_from_project(project, kit=project.scheme_mode or "Light")
        sketch_dir = args.output
        sketch_dir.mkdir(parents=True, exist_ok=True)
        sketch_path = sketch_dir / "sketch.ino"
        with open(sketch_path, "w") as f:
            f.write(sketch)
        print(f"generated {len(sketch)} chars to {sketch_dir}/sketch.ino")
        return 0

    if args.command == "compile":
        sketch_dir = Path(".sketch").resolve()
        if not sketch_dir.is_dir():
            print("error: no .sketch directory found. Run 'graphz generate' first.", file=sys.stderr)
            return 1

        bootloader_flag = ""
        if args.bootloader == "old":
            bootloader_flag = ":cpu=atmega328old"

        result = subprocess.run(
            ["arduino-cli", "compile", "--fqbn", f"arduino:avr:nano{bootloader_flag}", str(sketch_dir)],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            print(f"compile failed:\n{result.stderr}", file=sys.stderr)
            return 1

        print("compile OK")
        return 0

    if args.command == "upload":
        sketch_path = Path(".sketch") / "sketch.ino"
        if not sketch_path.exists():
            print("error: no sketch.ino found in .sketch directory. Run 'graphz generate' first.", file=sys.stderr)
            return 1

        port = args.port or auto_detect_port()
        if port is None:
            print("error: no serial port found. specify with --port", file=sys.stderr)
            return 1

        bootloader_flag = ""
        if args.bootloader == "old":
            bootloader_flag = ":cpu=atmega328old"

        result = subprocess.run(
            ["arduino-cli", "upload", "-p", port, "--fqbn", f"arduino:avr:nano{bootloader_flag}", str(sketch_path.parent)],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            print(f"upload failed:\n{result.stderr}", file=sys.stderr)
            return 1

        print("upload OK")
        return 0

    if args.command == "ports":
        result = subprocess.run(["arduino-cli", "board", "list"], capture_output=True, text=True)
        print(result.stdout)
        return 0

    return 1


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
