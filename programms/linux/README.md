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

The Blockly editor provides a drag-and-drop interface for creating GraphZ programs.

### Launch
```bash
# Open in browser (served from the project directory)
python3 -m http.server 8080
# Then open http://localhost:8080/web/blockly_editor.html
```

Or open directly: `file:///home/viktor-chiarcos/GitHub/GraphZ/programms/linux/web/blockly_editor.html`

### Features
- **Kit selection**: Light, Start, Basic, Mobile
- **Mode selection**: Newbie, Expert
- **Custom blocks**:
  - `start` - program entry point (ChosenActionIndex = "-1")
  - `timer` - delay in centiseconds (×100 = ms)
  - `led_matrix_text` - display text on LED matrix
  - `led_matrix_draw` - set matrix pixel colors
  - `pair` - loop block with iteration count
  - `timer_basic` - basic timer for Basic kit
- **Generate code**: Click "Generate" to produce JavaScript text representation
- **Reset**: Trash can removes all blocks

### Block Definitions
| Block | Purpose | Fields |
|-------|---------|--------|
| `start` | Program entry point | - |
| `timer` | Delay (centiseconds) | `duration` (number) |
| `led_matrix_text` | Display text on matrix | `text` (string) |
| `led_matrix_draw` | Draw on matrix | `colours` (string triplets), `pin` (number) |
| `pair` | Loop with iterations | `iterations` (number) |
| `timer_basic` | Basic kit timer | `duration` (number) |

### Output
The editor can output JavaScript code representation of the block graph, which can be adapted for Arduino C++ generation.

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
graphz generate <file>            # Generate a sketch
graphz validate <file>            # Validate structure
```
