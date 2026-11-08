"""C++ code emitter for GraphZ graphs."""

from __future__ import annotations

from graphz.codegen.analyze import analyze_graph

# Pin profiles per kit (from oracle capture)
LIGHT_PINS = {
    "matrix_data": 8,
    "button1": 9,
    "button2": 5,
    "button3": 6,
}

BASIC_PINS = {
    "traffic_light_red": 5,
    "traffic_light_yellow": 6,
    "traffic_light_green": 9,
    "traffic_light_arrow": 8,
    "motor_pwm": 3,
    "motor_dir": 4,
    "rgb_pin": 11,
    "variable_resistor": None,  # analog pin, handled specially
    "binary_output": 7,
}

MOBILE_PINS = {
    "ultrasonic_trig": 12,
    "ultrasonic_echo": 13,
    "synth_pin": 10,
    "matrix_pins": (6, 7),  # 8x8 matrix NeoPixel config
}

# Named color RGB lookup (from oracle)
NAMED_COLORS = {
    "none": None,
    "White": (255, 255, 255),
    "Red": (255, 0, 0),
    "Green": (150, 255, 0),
    "Blue": (0, 0, 255),
    "Yellow": (255, 255, 0),
    "Orange": (255, 150, 0),
    "Purple": (100, 0, 255),
    "Velvet": (200, 0, 255),
    "LigthBlue": (0, 200, 255),  # original GraphZ spelling
}

# Block type categories
BLOCK_CATEGORIES = {
    "light": {"LEDMatrixText", "LEDMatrixDraw", "LEDMatrixTemplate", "Timer", "Lamp", "RGB", "Start", "UniversalIndicator"},
    "basic": {"TrafficLight", "Motor", "DiodeRed1", "DiodeBlue1", "Lamp", "RGB", "Start", "VariableResistor", "BinaryOutput"},
    "mobile": {"LEDMatrixText", "LEDMatrixDraw", "LEDMatrixTemplate", "Synth", "Ultrasonic", "Start", "Button", "RunningLights"},
}

# Timer: centiseconds -> milliseconds
def centis_to_ms(cs: str) -> str:
    """Convert centiseconds (GraphZ timer values) to milliseconds for delay()."""
    try:
        return str(int(cs) * 100)
    except (ValueError, TypeError):
        return "0"


def rgb_str(rgb) -> str:
    """Convert RGB tuple to FastLED/NeoPixel color string."""
    if rgb is None:
        return "CRGB::Black"
    return f"CRGB({rgb[0]}, {rgb[1]}, {rgb[2]})"


def named_color_rgb(name: str) -> tuple | None:
    """Look up RGB value by named color from GraphZ."""
    return NAMED_COLORS.get(name)


def get_pin(profile: dict, key: str, default: int = 8) -> int | None:
    """Get a pin number from a circuit profile, with a default.

    Returns None for pins that are analog/ special-cased.
    """
    val = profile.get(key, default)
    if val is None or val is True:  # analog pin marker
        return None
    return val


def emit_sketch(project: Project, kit: str = "Light") -> str:
    """Generate Arduino C++ sketch source from a parsed .gphz project.

    Args:
        project: Parsed Project from the tolerant parser.
        kit: Circuit kit name ("Light", "Basic", or "Mobile").

    Returns:
        Source code as a string (valid UTF-8 C++).
    """
    ir = analyze_graph(project)
    roots = ir["roots"]
    chains = ir["chains"]
    cycles = ir["cycles"]
    unreachable = ir["unreachable"]
    iteration_pairs = ir["iteration_pairs"]

    # Select pin profile
    if kit == "Light":
        pins = LIGHT_PINS
    elif kit == "Basic":
        pins = BASIC_PINS
    elif kit == "Mobile":
        pins = MOBILE_PINS
    else:
        pins = {}

    # Build includes
    includes = [
        "#include <Adafruit_GFX.h>",
        "#include <Adafruit_NeoMatrix.h>",
        "#include <Adafruit_NeoPixel.h>",
        "#include <FastLED.h>",
    ]

    # Helper: emit RGB color from named color or RGB triple
    def emit_color(color_spec) -> str:
        """Convert a SubParams-style color spec to FastLED CRGB.

        color_spec can be:
        - An RGB triple like "255,0,0"
        - A named color like "Red", "Blue", etc.
        - A comma-separated list (first triplet wins)
        """
        if color_spec is None:
            return "CRGB::Black"
        parts = str(color_spec).split(";")
        # First triplet wins
        triplet = parts[0].split(",")
        if len(triplet) == 3:
            try:
                r, g, b = int(triplet[0]), int(triplet[1]), int(triplet[2])
                return f"CRGB({r}, {g}, {b})"
            except ValueError:
                pass
        # Named color
        name = parts[0].strip()
        rgb = named_color_rgb(name)
        if rgb:
            return f"CRGB({rgb[0]}, {rgb[1]}, {rgb[2]})"
        return "CRGB::Black"

    # Build setup() code
    setup_lines: list[str] = []

    # Matrix setup (for Light/Mobile kits)
    if kit in ("Light", "Mobile"):
        matrix_pin = pins.get("matrix_data", 8)
        setup_lines.append("Adafruit_NeoMatrix matrix = Adafruit_NeoMatrix(8, 8, " +
                           f"{matrix_pin}, NEO_MATRIX_BOTTOM + NEO_MATRIX_RIGHT +" +
                           " NEO_MATRIX_ROWS + NEO_MATRIX_PROGRESSIVE," +
                           " NEO_GRB + NEO_KHZ800);")
        setup_lines.append("matrix.begin();")
        setup_lines.append("matrix.setBrightness(10);")

    # Pin mode setup
    # Collect all pins used in this project
    used_pins: set[int] = set()
    for block in project.blocks:
        # Check sub_params for pin references or color values
        sp = block.sub_params
        if sp:
            # Parse first triplet for RGB
            first_semi = str(sp).split(";")[0]
            triplet = first_semi.split(",")
            if len(triplet) == 3:
                try:
                    r, g, b = int(triplet[0]), int(triplet[1]), int(triplet[2])
                    # If it looks like an RGB color, add as a used pin if RGB pin configured
                    if kit == "Basic" and pins.get("rgb_pin"):
                        used_pins.add(pins["rgb_pin"])
                except ValueError:
                    pass

    # Standard pin modes for kit
    if kit == "Light":
        for pin_key, pin_num in pins.items():
            if pin_num is not None:
                setup_lines.append(f"pinMode({pin_num}, INPUT_PULLUP);")
    elif kit == "Basic":
        # Traffic light pins
        for pin_key in ["traffic_light_red", "traffic_light_yellow", "traffic_light_green", "traffic_light_arrow"]:
            pin_num = pins.get(pin_key)
            if pin_num is not None:
                setup_lines.append(f"pinMode({pin_num}, OUTPUT);")
        # Motor pins
        for motor_key in ["motor_pwm", "motor_dir"]:
            pin_num = pins.get(motor_key)
            if pin_num is not None:
                setup_lines.append(f"pinMode({pin_num}, OUTPUT);")
        # RGB pin
        rgb_pin = pins.get("rgb_pin")
        if rgb_pin is not None:
            setup_lines.append(f"pinMode({rgb_pin}, OUTPUT);")
        # Binary output
        bin_pin = pins.get("binary_output")
        if bin_pin is not None:
            setup_lines.append(f"pinMode({bin_pin}, OUTPUT);")
    elif kit == "Mobile":
        # Ultrasonic pins
        for uc_key in ["ultrasonic_trig", "ultrasonic_echo"]:
            pin_num = pins.get(uc_key)
            if pin_num is not None:
                setup_lines.append(f"pinMode({pin_num}, OUTPUT);")
        # Synth pin
        synth_pin = pins.get("synth_pin")
        if synth_pin is not None:
            setup_lines.append(f"pinMode({synth_pin}, OUTPUT);")
        # Matrix pins
        matrix_pins = pins.get("matrix_pins", (6, 7))
        if isinstance(matrix_pins, tuple) and len(matrix_pins) >= 2:
            setup_lines.append(f"pinMode({matrix_pins[0]}, OUTPUT);")
            setup_lines.append(f"pinMode({matrix_pins[1]}, OUTPUT);")

    # Loop constructs for cycles
    loop_lines: list[str] = []
    for cycle_tag in cycles:
        loop_lines.append(f"  // Cycle at tag {cycle_tag}")
        loop_lines.append("  while(1) {")
        # Add appropriate delay based on kit
        if kit == "Light":
            loop_lines.append("    delay(500);")
        elif kit == "Basic":
            loop_lines.append("    delay(200);")  # traffic light timing
        elif kit == "Mobile":
            loop_lines.append("    delay(100);")
        loop_lines.append("  }")

    # Emit iteration pair handling
    iteration_code: list[str] = []
    for pair_tag, iterations in iteration_pairs.items():
        iteration_code.append(f"  // Iteration pair at tag {pair_tag}: {iterations} iterations")
        iteration_code.append(f"  for(int i = 0; i < {iterations}; i++) {{")

    # Timer delays helper
    def delay_ms(cs_value: str) -> str:
        return centis_to_ms(cs_value)

    # Build the complete sketch
    sketch_parts: list[str] = []

    # Includes
    sketch_parts.append("// Auto-generated by GraphZ Linux port")
    sketch_parts.append("")
    for inc in includes:
        sketch_parts.append(inc)
    sketch_parts.append("")

    # Global objects
    sketch_parts.append("// Global objects declared in setup")
    sketch_parts.append("Adafruit_NeoMatrix matrix = Adafruit_NeoMatrix(8, 8, " +
                         f"{pins.get('matrix_data', 8)}, NEO_MATRIX_BOTTOM + NEO_MATRIX_RIGHT +" +
                         " NEO_MATRIX_ROWS + NEO_MATRIX_PROGRESSIVE," +
                         " NEO_GRB + NEO_KHZ800);")
    sketch_parts.append("const int MAX_BRIGHTNESS = 10;")
    sketch_parts.append("")

    # setup()
    sketch_parts.append("void setup() {")
    for sl in setup_lines:
        sketch_parts.append(sl)
    for ll in loop_lines:
        sketch_parts.append(ll)
    for ic in iteration_code:
        sketch_parts.append(ic)
    sketch_parts.append("}")

    # loop()
    sketch_parts.append("void loop() {")
    sketch_parts.append("  // Generated graph code placed here")
    sketch_parts.append("  // Cycles are handled in setup() with while(1)")
    sketch_parts.append("}")

    return "\n".join(sketch_parts)


# Public API
def emit_from_project(project: Project, kit: str = "Light") -> str:
    """Public API: emit Arduino C++ from a parsed project.

    Args:
        project: Parsed Project from the tolerant parser.
        kit: Circuit kit name ("Light", "Basic", or "Mobile").

    Returns:
        Source code string.
    """
    return emit_sketch(project, kit)
