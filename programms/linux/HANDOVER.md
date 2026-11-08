# GraphZ Linux Port - Handover

Date: 2026-11-08
Status: planning complete, implementation not started
Next environment: Raspberry Pi with a working Arduino Nano

## 1. Executive summary

The original GraphZ application is a Windows/.NET WinForms program that turns a
visual block graph into Arduino C++ and uploads it to an Arduino Nano. The goal
is a Linux-native replacement for Ubuntu and Raspberry Pi that:

- reads and writes the existing `.gphz` project format;
- supports all four GraphZ kits and all of their circuits/components;
- provides a modern Blockly-based editor;
- generates Arduino C++ and compiles/uploads with `arduino-cli`;
- is implemented clean-room, without copying or redistributing vendor code or
  assets.

A complete working GraphZ installation has been found under
`programms/wine/GraphZ/`. It can be used as a black-box oracle on an x86 Ubuntu
machine. It does not need to run on the Raspberry Pi.

## 2. What we have

- Full working GraphZ copy, including `Znatok.exe`, DLLs, circuits, resources,
  bundled Arduino toolchain and libraries:
  `programms/wine/GraphZ/`
- Original Windows installer:
  `programms/windows/graphz-setup.exe` (not needed for the port).
- English manual:
  `programms/wine/GraphZ/Resources/Znatok Arduino EN.pdf`
- Russian manual:
  `programms/wine/GraphZ/Resources/Znatok Arduino RU.pdf`
- 40 example `.gphz` files in the repository root and `graphvis2gphz/`.
- Three example files that are not valid JSON and require tolerant parsing:
  - `komando_licht_hallo_opa.gphz`
  - `template_arduino_light_mini_text_for_graphviz.gphz`
  - `graphvis2gphz/beispiel_arduino-light.gphz`
- An empty target directory for the Linux port:
  `programms/linux/`
- A working Arduino Nano available for hardware-in-the-loop testing.

## 3. Confirmed technical facts

### Kits and circuits

The application has four circuit families:

| Kit | Circuits JSON | Count |
| --- | --- | ---: |
| Light | `Circuits/circuits_light.json` | 4 |
| Start | `Circuits/circuits_start.json` | 14 |
| Basic | `Circuits/circuits_basic.json` | 31 |
| Mobile | `Circuits/circuits_mobile.json` | 14 |

Total: 63 circuits.

Each circuit JSON entry has only `id`, `circuitName`, and `imgFileName`.
Circuit images live in `Circuits/<Kit>/`.

### `.gphz` format

A `.gphz` file is a JSON array:

- First object: project metadata, currently only
  `{"SchemeId": "...", "SchemeMode": "..."}`
- Following objects: blocks.

Observed block fields:

- `BlockType`
- `BlockConnectionTag`
- `OutputLine`
- `OutputLineFromOrientation`
- `OutputLineToOrientation`
- `DiamondBlock`
- `ChosenActionIndex`
- `MaskedTextBoxValue`
- `ActionOptionValue`
- `SubParams`
- `RealCoordsX`
- `RealCoordsY`
- `IterationsPairBlock` (only on `PairBlock`)

Important semantics:

- `SchemeMode` observed values are `Newbie` and `Expert`.
- `SchemeId` is a circuit id inside the currently selected kit. The file does
  not store which kit it belongs to. GraphZ selects the kit at startup before
  opening a project.
- `OutputLine` is a block tag reference and defines the next block.
- Each normal block has at most one successor.
- A graph can contain cycles. Cycles mean "repeat".
- Blocks not reachable from a `Start` block must be preserved on save but must
  not be executed.
- `Start` blocks have `ChosenActionIndex = "-1"`.
- `PairBlock` plus `PairLowerBlock` represent a loop construct. Exact semantics
  still need oracle confirmation.
- `DiamondBlock` exists but does not appear in the current example corpus. Its
  semantics and whether it is exposed in the UI still need confirmation.
- `MaskedTextBoxValue` stores numeric or text parameters.
- `SubParams` uses block-specific formats, for example:
  - LED matrix text: `R,G,B;scroll_ms;text;`
  - LED matrix draw: semicolon-separated color names, one per pixel.
- `ActionOptionValue` may be used for custom choices such as RGB colors, but
  all current examples have it as `null`.
- `ChosenActionIndex` is block-specific and may differ by circuit/kit/mode.

### Observed block types in the example corpus

`Start`, `Timer`, `LEDMatrixDraw`, `LEDMatrixText`, `LEDMatrixTemplate`,
`TrafficLight`, `RGB`, `Lamp`, `UniversalIndicator`, `Motor`, `DiodeRed1`,
`DiodeBlue1`, `Synth`, `PairBlock`, `PairLowerBlock`.

The application and resources also expose these component/block families:

- LED/diode variants: red, green, blue, yellow, super-bright variants;
  linear, non-linear, wave and border resistor variants.
- Lamp and lamp-with-resistor.
- RGB (set/random).
- LED matrix: draw, text, template.
- Traffic light.
- Universal indicator.
- Synth/piezo and music notes.
- Motor: basic, reductor, movement, steering, headlight.
- Servo.
- Button push.
- Photo resistor.
- Variable resistor.
- Ultrasonic distance sensor.
- Temperature indicator.
- Binary output.
- Running lights.
- Pair/loop and conditional/diamond constructs.

### Generated code and toolchain

- Board: Arduino Nano.
- FQBN used by GraphZ: `arduino:avr:nano`.
- Bundled Arduino AVR core: 1.8.2.
- Bundled libraries:
  - Adafruit NeoMatrix 1.1.5
  - Adafruit NeoPixel 1.6.0
  - Adafruit GFX 1.10.1
  - FastLED 3.3.3
  - Servo 1.1.6
  - Ultrasonic (Erick Simoes, MIT)
- GraphZ writes the generated sketch to:
  `programms/wine/GraphZ/tools/tempSketch/tempSketch.ino`
  before/while compiling. This is the main oracle capture point.
- Build metadata is written to:
  `programms/wine/GraphZ/tools/output/build.options.json`
- Observed code styles:
  - Some cyclic programs use `while(1) { ... }` inside `setup()` and leave
    `loop()` empty.
  - Some examples place the repeating code in `loop()`.
  - The exact rule must be determined from the current app, not from older
    README snippets.
- Timer values are centiseconds. Example: `99` becomes `delay(9900)`.
- Light circuit pin facts from the existing examples:
  - Matrix data pin: 8
  - Button 1: 9
  - Button 2: 5
  - Button 3: 6
  - Traffic light red: 5, yellow: 6, green: 9, arrow: 8 in the basic example.
  - These must be confirmed per circuit via the oracle.

### Color names

Observed names include:

`none`, `White`, `Red`, `Green`, `Blue`, `Yellow`, `Orange`, `Purple`,
`Velvet`, `LigthBlue`, `LightGreen`.

Known RGB values from examples:

| Name | RGB |
| --- | --- |
| Purple | 100, 0, 255 |
| Velvet | 200, 0, 255 |
| Blue | 0, 0, 255 |
| LigthBlue | 0, 200, 255 |
| White | 255, 255, 255 |
| Orange | 255, 150, 0 |
| Yellow | 255, 255, 0 |
| Red | 255, 0, 0 |
| Green | 150, 255, 0 |

The full table must be captured for all named colors.

## 4. Scope

### In scope for the first complete release

- All 4 kits and 63 circuits.
- Both `Newbie` and `Expert` modes.
- All block types and actions exposed by the original application.
- Import/export of existing `.gphz` files, including tolerant handling of the
  three malformed examples.
- Modern Blockly editor with palette, graph editing, parameter dialogs, live
  C++ preview, save/load, compile and upload.
- Arduino Nano compile and upload on Ubuntu and Raspberry Pi.
- Clean-room authored specification, code and assets.

### Explicit non-goals for now

- Snap! frontend.
- Simulation, step debugging or live hardware visualization.
- Cloud sync or multi-user features.
- Custom C++ injection.
- Guaranteeing byte-identical generated C++; behavioral equivalence is the
  target.
- Bundling or redistributing vendor PDFs, images, fonts, DLLs, `Znatok.exe` or
  `programms/wine/`.

## 5. Recommended architecture

Use the existing empty target directory:

```text
programms/linux/
  HANDOVER.md
  pyproject.toml
  src/graphz/
    model.py          # project/block graph model
    parser.py         # tolerant .gphz reader
    serializer.py     # valid .gphz writer
    specs/            # block and circuit specifications
    blocks/           # block registry and action definitions
    circuits/         # kit/circuit profiles and pin maps
    codegen/          # IR, C++ emitter, HAL
    compiler.py       # arduino-cli integration
    uploader.py       # port detection and upload
    server.py         # local FastAPI server
    cli.py            # graphz command
  web/
    package.json
    src/              # Blockly/TypeScript editor
    dist/             # prebuilt static assets for Pi
  tests/
  docs/spec/          # authored clean-room behavioral specification
  scripts/
```

Recommended stack:

- Backend/core: Python 3.11, FastAPI, pyserial.
- Frontend: Blockly, TypeScript, Vite.
- Toolchain: `arduino-cli`.
- Packaging: `pipx`/`uv` for the Python app; prebuilt frontend so Node is not
  required on the Raspberry Pi.

### Core design decisions

- The graph model is the source of truth. Blockly is an editing projection.
- Preserve original block tags, coordinates, unknown fields and unreachable
  blocks for compatibility.
- Block and circuit specifications are data-driven JSON/TOML so the palette,
  dialogs, validation and code generation cannot drift apart.
- The graph is functional: at most one successor per block. Analyze chains,
  lassos and cycles before code generation.
- Do not rely on Blockly next-connections to represent cycles. Use a custom
  loop/graph representation and a dedicated design spike before implementing
  the editor. Possible approach: represent cycles as custom "repeat forever"
  containers while keeping the original graph model for round-trip export.
- Generate deterministic C++ from our own emitter and HAL; do not copy vendor
  code templates.
- Provide a host-side mock Arduino HAL for behavior tests without hardware.

## 6. Oracle and clean-room process

The installed application is an oracle, not a source of implementation code.

Rules:

- Do not decompile, extract source, or copy embedded code templates.
- Do not copy vendor images, fonts, PDFs or predefined matrix templates into
  the new application.
- Use the public manuals and black-box generated sketches as the behavioral
  specification.
- Author our own circuit diagrams, block icons, matrix patterns and fonts.
- Keep raw oracle output out of git if it contains vendor-generated code.
- For a strict legal clean-room, use separate analyst and implementer roles:
  the analyst writes a behavioral specification; the implementer only sees the
  specification.

### Oracle capture on x86 Ubuntu

The Wine application is a 32/64-bit .NET WinForms app and is not a practical
target for the Raspberry Pi. Run oracle capture on an x86 Ubuntu machine.

1. Copy the whole app to a disposable directory, for example:
   `/tmp/opencode/graphz-oracle/app`.
2. Never run it in place in `programms/wine/GraphZ`; it rewrites
   `tools/tempSketch/` and `tools/output/`.
3. Run under Xvfb or a normal X session.
4. Drive the UI with `xdotool` or manually.
5. Create synthetic `.gphz` files from a known template, varying one block,
   action and parameter at a time.
6. Open the project, trigger "Check and Upload", and wait for
   `tools/tempSketch/tempSketch.ino` to change.
7. Copy the generated sketch and build metadata into the oracle corpus.
8. If upload blocks capture, replace `avrdude.exe` in the disposable copy with
   a logging no-op wrapper, or point the app at a virtual serial port.
9. Record pin defines, includes, delays, pin writes, library calls and code
   structure.

### Discovery matrix

For each kit and circuit:

- Capture the available block palette in both `Newbie` and `Expert` mode.
- Capture each block's action list and default parameters.
- Generate one minimal project per block/action.
- Extract `#define` pin mappings and `pinMode` calls.
- Record output behavior: digital/analog writes, delays, loops, includes.
- Record color, matrix template and melody tables.
- Test acyclic and cyclic graphs, Start in/out of the cycle, and unreachable
  blocks.
- Test `PairBlock`/`PairLowerBlock`, `DiamondBlock`, custom RGB colors and
  matrix text with German/Cyrillic characters.

## 7. Implementation phases

### Phase 0 - Oracle and specification

Deliverables:

- Disposable oracle harness.
- Corrected facts for pin maps, action indices, defaults, colors, templates and
  timings.
- `docs/spec/` behavioral specification.
- `docs/spec/circuits.json` authored from confirmed facts.
- Decision record for kit selection on import and any native project extension.

Acceptance:

- Every block/action in all four kits has a documented action index and
  behavior.
- Every circuit has a complete pin profile.
- The three malformed files have a documented recovery strategy.

### Phase 1 - Parser, model, serializer

Deliverables:

- Tolerant `.gphz` parser:
  - UTF-8 BOM.
  - Raw control characters.
  - Unescaped newlines and quotes in string values.
  - Trailing text/comments in `SubParams`.
  - Missing/duplicate tags.
- Model preserving unknown fields, coordinates, orientations, unreachable
  blocks and raw `SubParams`.
- Serializer producing valid JSON that GraphZ and the new app can both load.
- Round-trip tests for all 40 repository examples.

Acceptance:

- No crash on any example file.
- No silent block loss.
- Export/re-import is stable.

### Phase 2 - Core codegen for Light and Start

Deliverables:

- IR and graph analysis: chains, cycles, lassos, unreachable components.
- Circuit profiles and block registry for Light and Start.
- C++ emitter and HAL:
  - Pin defines and initialization.
  - LED/diode, lamp, RGB, traffic light, universal indicator, synth.
  - LED matrix draw, text and template.
  - Timer and loop constructs.
  - Correct C++ string escaping and UTF-8/German/Cyrillic matrix text.
- Host mock Arduino tests for pin/timing behavior.

Acceptance:

- Representative Light and Start projects compile with `arduino-cli`.
- Generated behavior matches the authored spec.
- All Light examples import and generate a compiling sketch.

### Phase 3 - CLI and Nano upload

Deliverables:

- `graphz compile`, `upload`, `ports`, `validate`, `generate`, `import`,
  `export`.
- `arduino-cli` bootstrap script:
  - `arduino:avr@1.8.2`
  - NeoMatrix/NeoPixel/GFX/FastLED/Servo libraries at confirmed versions.
- Port selection and Nano bootloader handling.
- Clear errors for missing core, missing libraries, permission denied and
  upload failure.

Acceptance:

- A generated sketch compiles and uploads to the working Nano from the
  Raspberry Pi.
- Both new and old Nano bootloaders are supported.

### Phase 4 - Blockly editor

Deliverables:

- Blockly workspace with custom blocks generated from the block registry.
- Kit, circuit and mode selectors.
- Palette filtered by circuit and mode.
- Drag, drop, connect, delete, undo/redo, zoom/pan.
- Custom loop representation that can round-trip GraphZ cycles.
- Parameter dialogs:
  - matrix draw, text and template;
  - color picker and named colors;
  - timer;
  - motor speed, servo angle, steering;
  - loop iterations;
  - sensor thresholds;
  - notes/melody.
- Live C++ preview.
- Import/export `.gphz`, save/load, compile/upload, port selector, error console.
- Authored SVG circuit diagrams. Optionally display the user's own local GraphZ
  circuit images without bundling them.

Acceptance:

- A user can open an existing `.gphz`, edit it, export it and upload it.
- Light and Start projects work end-to-end from the browser.

### Phase 5 - Full component coverage

Deliverables:

- Basic and Mobile kits.
- All diode/resistor/lamp variants.
- Motor basic/reductor/headlight, movement, steering, servo.
- Button, photo resistor, variable resistor, ultrasonic, temperature, binary,
  running lights, conditional/diamond blocks.
- 8x8 and 16x16 matrix support if present.
- Composite circuits: climate control, smart light, robo, safety, drive.
- Full 63-circuit compile matrix.

Acceptance:

- Every circuit has at least one representative program that compiles.
- Every exposed block/action is reachable in the editor and code generator.

### Phase 6 - Verification and packaging

Deliverables:

- Behavioral equivalence harness:
  - compile GraphZ-generated sketches and ours against a host mock Arduino;
  - compare pin/timing traces, not source text.
- Parser fuzz tests.
- CI for Python tests, frontend build and `arduino-cli compile`.
- Ubuntu and Raspberry Pi packaging/install instructions.
- Hardware-in-the-loop checklist for the Nano.
- Clean-room audit and license/attribution review.

Acceptance:

- CI green on Ubuntu.
- Manual end-to-end test on Raspberry Pi with the working Nano.
- No vendor assets or code in git.

## 8. Raspberry Pi and Arduino Nano setup

### Prerequisites

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip curl git
```

Install `arduino-cli` using the official installer, then verify:

```bash
arduino-cli version
arduino-cli config init
arduino-cli core update-index
arduino-cli core install arduino:avr@1.8.2
```

Install the confirmed libraries:

```bash
arduino-cli lib install "Adafruit NeoMatrix@1.1.5"
arduino-cli lib install "Adafruit NeoPixel@1.6.0"
arduino-cli lib install "Adafruit GFX Library@1.10.1"
arduino-cli lib install "FastLED@3.3.3"
arduino-cli lib install "Servo@1.1.6"
```

For Ultrasonic, use a public MIT implementation or an independently authored
equivalent. Verify the exact library name/version before adding it to the
bootstrap script.

Serial permissions:

```bash
sudo usermod -aG dialout "$USER"
```

Log out and back in, or reboot. For CH340/CP210x/FTDI clones, install the
appropriate udev rules if the Nano is not detected.

### Nano verification

```bash
arduino-cli board list
```

Test with a minimal blink sketch on the Nano LED (D13) before testing generated
code. Then:

```bash
arduino-cli compile --fqbn arduino:avr:nano <sketch-dir>
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano <sketch-dir>
```

If upload fails with a sync error, try the old bootloader:

```bash
arduino-cli upload -p /dev/ttyUSB0 \
  --fqbn arduino:avr:nano:cpu=atmega328old <sketch-dir>
```

Do not power motors, lamps or LED matrices from the Nano's 5V regulator. Use
the external supply specified by the kit and share ground.

## 9. Test strategy

### Unit and parser tests

- All 40 `.gphz` files load.
- The three malformed files are repaired without losing blocks.
- Unknown fields and coordinates survive round-trip.
- Unreachable blocks survive round-trip.
- Cycles and lassos are detected correctly.
- Duplicate or missing tags are handled deterministically.

### Code generation tests

- Compile with `arduino-cli` for `arduino:avr:nano`.
- Compile generated sketches on host against a mock `Arduino.h` and libraries.
- Compare behavior traces against oracle-generated sketches:
  - digital writes;
  - analog writes;
  - delays;
  - tone calls;
  - library calls and arguments;
  - loop entry/exit behavior.
- Test all named colors and matrix text with ASCII, German and Cyrillic text.

### Hardware tests

- Blink sketch first.
- One LED, one lamp, one RGB, one traffic light, one motor, one servo, one
  ultrasonic sensor, one matrix.
- All four kits with representative projects.
- Upload from the Raspberry Pi over USB.
- Record known-good wiring and pin maps.

### CI

- Ubuntu runner: Python tests, parser tests, frontend build, AVR compile matrix.
- No Wine application in CI.
- Raspberry Pi tests are manual or self-hosted.

## 10. Known unknowns to resolve with the oracle

1. Exact `DiamondBlock` semantics and whether it is exposed in either mode.
2. Exact `PairBlock` / `PairLowerBlock` code generation and iteration rules.
3. When GraphZ emits `while(1)` in `setup()` versus code in `loop()`.
4. How custom RGB colors are stored in `.gphz`.
5. Full named-color to RGB table.
6. Full built-in matrix template list and pixel patterns.
7. Exact action index mapping for every block, per circuit/mode.
8. Whether action lists differ between `Newbie` and `Expert`.
9. 8x8 vs 16x16 matrix behavior and text scrolling details.
10. Melody/note data for synth blocks.
11. Behavior with multiple `Start` blocks and disconnected components.
12. Exact pin profiles for all 63 circuits.

## 11. Default decisions for implementation

These are the recommended defaults. Change them only if there is a reason.

1. Stack: Python 3.11 + FastAPI + Blockly/TypeScript + `arduino-cli`.
2. Kit on import: ask the user to select the kit, matching GraphZ. Store an
   optional `KitId` only in a native sidecar or extension; export strict legacy
   `.gphz` by default.
3. Clean-room: black-box specification only. Use a formal analyst/implementer
   split if legal review requires it.
4. Compatibility: behavioral equivalence and valid `.gphz` exchange, not
   byte-identical generated C++.
5. Assets: authored diagrams/icons/patterns/fonts only. Vendor assets are never
   committed.
6. UI: local web app served on localhost first; desktop wrapper is optional
   later.

## 12. Security and repository hygiene

- The git remote URL currently contains a plaintext GitHub personal access
  token. Rotate/revoke it and remove it from `.git/config`. Never print or
  commit the token.
- `programms/wine/` is untracked vendor content and must not be committed.
- Add ignore rules for:
  - `programms/wine/`
  - `oracle/`
  - raw generated corpora
  - Python and frontend build artifacts
- Do not commit generated vendor sketches or extracted vendor assets.
- Review `git status` before every commit. The repository currently contains
  unrelated staged/untracked changes; stage only intended files.

## 13. First session on the Raspberry Pi

1. Pull the latest `main`.
2. Read this handover.
3. Install `arduino-cli`, the AVR core and libraries.
4. Verify the Nano with a blink sketch and record the working port and
   bootloader variant.
5. Create the `programms/linux/` scaffold.
6. Implement the tolerant parser and model.
7. Load all 40 example `.gphz` files and classify failures.
8. Implement the Light/Start circuit profiles and a minimal code generator.
9. Compile and upload one generated Light project to the Nano.
10. Add the first automated tests for parser and codegen.
11. Only after the hardware path works, start the Blockly editor spike.

## 14. Definition of done for the port

- All 40 example projects open without crashes or silent data loss.
- All 63 circuits are selectable and have correct pin profiles.
- All exposed blocks/actions work in both modes.
- Generated sketches compile for `arduino:avr:nano`.
- Representative programs for every kit upload and run on the working Nano.
- Import/export is stable and GraphZ-compatible where possible.
- The app runs on Ubuntu and Raspberry Pi.
- No vendor code or assets are shipped.
- Documentation, tests and hardware checklist are complete.

## 15. References

- `README.md` - original examples, generated Light/Lamp snippets, colors.
- `programms/wine/GraphZ/Resources/Znatok Arduino EN.pdf`
- `programms/wine/GraphZ/Resources/Znatok Arduino RU.pdf`
- `programms/wine/GraphZ/Circuits/*.json`
- `programms/wine/GraphZ/Circuits/<Kit>/` - circuit images.
- `programms/wine/GraphZ/tools/tempSketch/tempSketch.ino` - last generated
  sketch.
- `programms/wine/GraphZ/tools/output/build.options.json` - FQBN and build
  settings.
- `graphvis2gphz/Readme.md` - GraphViz-to-GraphZ notes.
- `graphvis2gphz/schaltkreis.dot` - Light circuit wiring reference.
