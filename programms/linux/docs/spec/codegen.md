# Code Generation Specification

## Graph to C++ Mapping Rules

### Graph Structure
- The graph model is the source of truth. Blockly is an editing projection.
- At most one successor per block (OutputLine).
- Cycles mean "repeat forever". Represented as `while(1) { ... }` in `setup()` or code in `loop()`.
- A graph can contain cycles (lassos). Cycles mean "repeat".
- Blocks not reachable from a `Start` block must be preserved on save but must not be executed.

### Start Block
- `Start` blocks have `ChosenActionIndex = "-1"`.
- GraphZ selects the kit at startup before opening a project.
- The kit is determined by `SchemeId` (circuit id inside the currently selected kit).

### Pin Mapping
- Board: Arduino Nano.
- FQBN used: `arduino:avr:nano`.
- Arduino AVR core: 1.8.2.
- Bundled libraries (versions):
  - Adafruit NeoMatrix 1.1.5
  - Adafruit NeoPixel 1.6.0
  - Adafruit GFX 1.10.1
  - FastLED 3.3.3
  - Servo 1.1.6
  - Ultrasonic (Erick Simoes, MIT)
- Pin defines follow the pattern: `#define <NAME>_PIN <NUMBER>`
- `pinMode(<PIN>, INPUT_PULLUP)` for button inputs, `pinMode(<PIN>, OUTPUT)` for outputs.

### Block Code Generation

#### Timer
- Timer values are centiseconds. Example: `99` becomes `delay(9900)`.
- Timer block output connects to the next block.

#### LED / Diode
- `digitalWrite(<PIN>, HIGH)` / `digitalWrite(<PIN>, LOW)`
- Pin defines per circuit (confirm with oracle).

#### RGB
- Custom RGB colors stored via `ActionOptionValue` (currently all examples have it as `null`).
- Named colors map to RGB values in `colors.json`.

#### LED Matrix
- Matrix data pin: per circuit (from oracle, e.g., pin 8 for Light kit).
- Matrix control: `matrix.begin()`, `matrix.fillScreen(0)`, `matrix.setPixelColor(i, r, g, b)`, `matrix.show()`.
- Matrix text: scroll with `matrix.setCursor(x, y)`, `matrix.print()`.
- Matrix draw: set individual pixel colors.
- Templates: predefined patterns (full list pending oracle confirmation).

#### Traffic Light
- Red, yellow, green LEDs + arrow.
- Pin defines per circuit (e.g., red:5, yellow:6, green:9, arrow:8 in basic example).
- Sequence: `while(1)` in `setup()` with `delay(200)` between states, or code in `loop()`.

#### Universal Indicator
- Single LED with color.

#### Synth / Piezo
- `tone(<PIN>, frequency)` / `noTone(<PIN>)`
- Melody/note data pending oracle confirmation.

#### Motor
- Basic, reductor, movement, steering, headlight variants.
- Speed control via `analogWrite()` or PWM.

#### Servo
- `Servo.attach(<PIN>)` / `servo.write(<angle>)` / `servo.writeMicroseconds(<us>)`

#### PairBlock / PairLowerBlock (loop construct)
- `PairBlock` + `PairLowerBlock` represent a loop.
- `IterationsPairBlock` field stores iteration count (e.g., `"5"`).
- Code generation: either `while(1)` with break after N iterations, or `for` loop.

#### DiamondBlock
- Exists but does not appear in current example corpus.
- Semantics and UI exposure still need confirmation from oracle.

#### Color Names
- Known named colors with RGB values (from oracle):
  - `none`, `White`, `Red`, `Green`, `Blue`, `Yellow`, `Orange`, `Purple`, `Velvet`, `LigthBlue`
- RGB table in `docs/spec/colors.json`.

### Generated Sketch Structure
- Includes: `<Adafruit_GFX.h>`, `<Adafruit_NeoMatrix.h>`, `<Adafruit_NeoPixel.h>`, `<FastLED.h>`
- `setup()`: pinMode calls, matrix.begin(), library inits
- `loop()`: either empty (cyclic programs use `while(1)` in `setup()`) or contains the repeating code
- Timer delays in milliseconds (centiseconds × 100)
- `digitalWrite` for on/off outputs
- `analogWrite` for PWM outputs
- `tone`/`noTone` for piezo
- `` calls for library functions

### Tolerant .gphz Handling
- UTF-8 BOM accepted.
- Raw control characters inside strings escaped.
- Unescaped double quotes inside string values (e.g. `graphviz("Text")`) repaired.
- Invalid backslash escapes preserved as literal backslash.
- Trailing text/comments in `SubParams` preserved (e.g. `## -- COMMENT --`).
- Missing/duplicate tags handled deterministically.

### Circuit Selection on Import
- On import, ask user to select the kit, matching GraphZ behavior.
- Store optional `KitId` in a native sidecar/extension.
- Export strict legacy `.gphz` by default.

### Acceptance Criteria (Phase 0)
- Every block/action in all four kits has a documented action index and behavior.
- Every circuit has a complete pin profile.
- The three malformed files have a documented recovery strategy.

### Non-Goals (Phase 0)
- Byte-identical generated C++; behavioral equivalence is the target.
- Bundling or redistributing vendor PDFs, images, fonts, DLLs, Znatok.exe.
