# GraphZ Linux port

Linux-native replacement for the Windows GraphZ application. See
[`HANDOVER.md`](HANDOVER.md) for the full plan and clean-room rules.

## Status

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 0** | Tolerant `.gphz` parser/model/serializer, spec docs | ✅ Complete |
| **Phase 1** | Code generation for Light + Start kits (compile + upload to Nano) | ✅ Complete |
| **Phase 2** | Code generation for Basic + Mobile kits (traffic lights, motors, RGB, ultrasonic, synth) | ✅ Complete |
| **Phase 3** | CLI: `info`/`validate`/`convert`/`generate`/`compile`/`upload`/`ports` | ✅ Complete |
| **Phase 4** | Blockly visual editor (`web/blockly_editor.html`) | ✅ Complete |

## Quickstart

### Hardware
- Arduino Nano on `/dev/ttyUSB0` (old bootloader)
- `arduino-cli` with AVR core 1.8.2 and libraries (NeoMatrix, NeoPixel, GFX, FastLED, Servo, Ultrasonic)

### Installation
```bash
cd programms/linux
# Install dependencies
pip install -e .
# Install arduino-cli + libraries (see HANDOVER.md)
```

### Workflow

#### 1. Generate a sketch from a .gphz file
```bash
graphz generate ../../path/to/project.gphz --output ./my_sketch
```
This creates `my_sketch/sketch.ino` with the generated C++ code.

#### 2. Compile
```bash
graphz compile --bootloader old
```
Compiles with the old ATmega328P bootloader (verified on the Nano).

#### 3. Upload
```bash
graphz upload --port /dev/ttyUSB0 --bootloader old
```
Uploads the compiled sketch to the Nano.

#### 4. Validate (optional)
```bash
graphz validate project.gphz
```
Reports structural issues (missing tags, duplicate tags, dangling outputs, self-loops/cycles).

#### 5. Convert (repair malformed files)
```bash
graphz convert project.gphz output.gphz
```
Repairs the 3 known malformed formats (unescaped quotes, embedded comments, Cyrillic newlines) into strict JSON.

#### 5. Info / Validate
```bash
graphz info project.gphz
# file: project.gphz
# kit id: 1
# mode: Expert
# blocks: 6

graphz validate project.gphz
# ok
# repeats (self loops): [1]  -- self-loop = valid "repeat" in GraphZ
# cycles: ['PairBlock2']
```

## Blockly Visual Editor

The editor is a Vite + TypeScript + Blockly application in `web/`. It reads the
kit, circuit and block registries from `docs/spec/` so the palette and preview
cannot drift from the documented specs.

### Launch
```bash
cd web
npm install
npm run dev
# Open http://localhost:8080/web/blockly_editor.html
```

Node.js 18 or newer is required for the frontend toolchain. To verify a
production build:

```bash
cd web
npm run build
npm run preview
```

### Features
- **Kit / circuit / mode selectors**: Light, Start, Basic, Mobile; 63 circuits;
  Newbie and Expert modes.
- **Filtered palette**: only blocks relevant to the selected kit and mode.
- **Custom blocks**: Start, Timer, loop (PairBlock/PairLowerBlock), LED matrix
  text/draw/template, Lamp, RGB, TrafficLight, UniversalIndicator, Motor, Synth,
  red/blue diodes.
- **Matrix editor**: click an LED matrix draw block, then "Edit matrix" for an
  8x8 colour grid.
- **Live C++ preview**: generated from the Blockly workspace using the kit pin
  profiles in `docs/spec/codegen.md`.
- **Import / export `.gphz`**: tolerant import (BOM, unescaped quotes, raw
  newlines) and legacy array-shaped export.
- **Undo/redo, zoom/pan, trashcan**: provided by Blockly.

### Block Definitions
| Block | GraphZ type | Fields |
|-------|-------------|--------|
| Start | `Start` | - |
| Timer | `Timer` | `DURATION` (centiseconds) |
| Loop | `PairBlock` / `PairLowerBlock` | `ITERATIONS` |
| Matrix text | `LEDMatrixText` | `TEXT`, `COLOUR`, `SPEED` |
| Matrix draw | `LEDMatrixDraw` | `PIXELS` (64 named colours) |
| Matrix template | `LEDMatrixTemplate` | `TEMPLATE` |
| Lamp / RGB / traffic light / indicator / diodes | matching GraphZ types | `ACTION`, `VALUE` |
| Motor | `Motor` | `ACTION`, `VALUE` (speed) |
| Synth | `Synth` | `ACTION`, `VALUE` |

### Frontend layout
```text
web/
  blockly_editor.html   # Vite entry point
  package.json          # npm scripts and Blockly dependency
  vite.config.ts        # dev/preview server on port 8080, base /web/
  tsconfig.json
  src/
    main.ts             # workspace setup, toolbar wiring, live preview
    spec.ts             # loads docs/spec/*.json and colour helpers
    blocks/
      registry.ts       # Blockly JSON definitions + .gphz field mapping
      toolbox.ts        # kit/mode filtered toolbox
    graphz/
      parse.ts          # tolerant .gphz JSON repair
      serialize.ts      # import/export of legacy array-shaped .gphz
      codegen.ts        # client-side C++ preview
    styles.css
```

The editor loads `docs/spec/circuits.json`, `blocks.json`, `colors.json` and
`codegen.md` conventions directly, so keep those files as the source of truth.
Unknown GraphZ action indices are preserved in the `ACTION`/`VALUE` fields
rather than being discarded, which keeps import/export lossless for the parts
the spec does not yet describe.

### Notes
- `python3 -m http.server` only serves the old static HTML; use `npm run dev`
  (or `npm run build && npm run preview`) for the Vite editor.
- If port 8080 is occupied, stop the previous server or edit `server.port` and
  `preview.port` in `web/vite.config.ts`.
- The C++ preview is intended for editing feedback. Compile and upload still use
  the Python CLI and `arduino-cli`.

## CLI Reference

| Command | Description |
|---|---|
| `graphz info <project>` | Show project metadata (kit id, mode, block count) |
| `graphz validate <project>` | Validate graph structure, report issues |
| `graphz convert <project> <output>` | Repair malformed .gphz files |
| `graphz generate <project> [--output DIR]` | Generate Arduino C++ sketch |
| `graphz compile [--bootloader old]` | Compile with arduino-cli |
| `graphz upload [--port PORT] [--bootloader old]` | Upload to Arduino Nano |
| `graphz ports` | List available serial ports |
| `graphz generate <project> --output DIR` | Generate sketch to custom directory |

## Spec Files (`docs/spec/`)
- `circuits.json` - 63 circuits across 4 kits (Basic/Light/Start/Mobile)
- `blocks.json` - 15 block types with field lists and samples
- `colors.json` - 9 named colors with RGB values
- `codegen.md` - Graph→C++ mapping rules, pin defines, timer/loop handling, color table

## Clean Room
- `programms/wine/` is ignored by `.gitignore` and must never be committed
- No vendor assets or code are shipped
- Behavioral facts in `docs/spec/` derived from black-box observation only
- Behavioral equivalence is the target, not byte-identical C++

## Development
```bash
cd programms/linux
pytest                          # Run all 135 tests
graphz generate <file>          # Generate a sketch
graphz validate <file>          # Validate structure
```

Frontend checks:

```bash
cd programms/linux/web
npm run typecheck               # TypeScript only
npm run build                   # Typecheck + production bundle in web/dist/
npm run preview                 # Serve the built bundle on port 8080
```
