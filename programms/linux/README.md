# GraphZ Linux port

Linux-native replacement for the Windows GraphZ application. See
[`HANDOVER.md`](HANDOVER.md) for the full plan and clean-room rules.

## Status

Phase 1 is in progress:

- [x] Tolerant `.gphz` parser (BOM, raw control characters, unescaped quotes,
      invalid escapes, embedded comments).
- [x] Project/block model that preserves unknown fields, order and values.
- [x] Legacy-format serializer with valid JSON output.
- [x] Round-trip and structural tests for all 40 repository examples.
- [ ] Oracle-derived block/circuit specification (Phase 0).
- [ ] Code generator, CLI compile/upload, Blockly editor.

## Layout

```text
programms/linux/
  pyproject.toml
  src/graphz/
    model.py        # Project, Block, structural validation
    parser.py       # tolerant reader + string-literal repair
    serializer.py   # legacy .gphz writer
    cli.py          # graphz info/validate/convert
  tests/
  docs/spec/        # clean-room behavioral specification (to be filled)
```

## Development

```bash
cd programms/linux
pytest
```

Run the CLI without installing:

```bash
PYTHONPATH=src python3 -m graphz.cli info ../../lampprog.gphz
PYTHONPATH=src python3 -m graphz.cli validate ../../lampprog.gphz
PYTHONPATH=src python3 -m graphz.cli convert input.gphz output.gphz
```

`convert` loads a malformed file through the tolerant parser and writes a
strict-JSON `.gphz` file that can be read by GraphZ again.

## Clean room

`programms/wine/`, `oracle/`, generated sketches and extracted vendor assets
are ignored by git and must never be committed. Behavioral facts belong in
`docs/spec/`; implementation code is authored independently.
