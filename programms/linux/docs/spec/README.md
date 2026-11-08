# Behavioral specification

This directory holds the authored, clean-room specification derived from
black-box observation of GraphZ and from the public manuals. It is the only
input the implementation should use for vendor behavior.

Nothing here may be copied from vendor source, decompiled code, embedded
templates, images or fonts.

## Required captures

| Area | Status | Notes |
| --- | --- | --- |
| `.gphz` field semantics | partial | see `HANDOVER.md` sections 3 and 10 |
| Kit/circuit list and ids | pending | `Circuits/circuits_*.json` |
| Pin profile per circuit | pending | confirm with oracle `#define`/`pinMode` |
| Palette per kit and mode | pending | `Newbie` vs `Expert` |
| Action index per block | pending | may vary by circuit/mode |
| Named colors and RGB values | partial | full table pending |
| Matrix templates and patterns | pending | authored equivalents only |
| Synth notes and melodies | pending | |
| `PairBlock` / `PairLowerBlock` | pending | iterations, code shape |
| `DiamondBlock` | pending | semantics and UI exposure |
| `while(1)` vs `loop()` rule | pending | |
| Custom RGB storage | pending | |

## Planned files

- `circuits.json` - authored circuit profiles keyed by kit and `SchemeId`.
- `blocks.json` - block types, actions, parameters and defaults.
- `colors.json` - named color to RGB table.
- `codegen.md` - graph analysis and C++ emission rules.
- `oracle-log.md` - capture methodology and observed results (no vendor code).
