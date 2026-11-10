import * as Blockly from 'blockly/core';
import { COLORS, type Kit } from '../spec';

interface PinProfile {
  defines: Record<string, number>;
  matrix: boolean;
  includes: string[];
}

const LIGHT_PINS: PinProfile = {
  defines: {
    MATRIX_DATA_PIN: 8,
    BUTTON_1_PIN: 9,
    BUTTON_2_PIN: 5,
    BUTTON_3_PIN: 6,
  },
  matrix: true,
  includes: [
    '#include <Adafruit_GFX.h>',
    '#include <Adafruit_NeoMatrix.h>',
    '#include <Adafruit_NeoPixel.h>',
  ],
};

const BASIC_PINS: PinProfile = {
  defines: {
    TRAFFIC_RED_PIN: 5,
    TRAFFIC_YELLOW_PIN: 6,
    TRAFFIC_GREEN_PIN: 9,
    TRAFFIC_ARROW_PIN: 8,
    MOTOR_PWM_PIN: 3,
    MOTOR_DIR_PIN: 4,
    RGB_PIN: 11,
    BINARY_OUTPUT_PIN: 7,
    LAMP_PIN: 7,
    RED_DIODE_PIN: 5,
    BLUE_DIODE_PIN: 6,
  },
  matrix: false,
  includes: ['#include <FastLED.h>'],
};

const MOBILE_PINS: PinProfile = {
  defines: {
    ULTRASONIC_TRIG_PIN: 12,
    ULTRASONIC_ECHO_PIN: 13,
    SYNTH_PIN: 10,
    MATRIX_DATA_PIN: 6,
    MATRIX_CLOCK_PIN: 7,
    MOTOR_PWM_PIN: 3,
    MOTOR_DIR_PIN: 4,
    LAMP_PIN: 9,
  },
  matrix: true,
  includes: [
    '#include <Adafruit_GFX.h>',
    '#include <Adafruit_NeoMatrix.h>',
    '#include <Adafruit_NeoPixel.h>',
    '#include <FastLED.h>',
  ],
};

const START_PINS: PinProfile = {
  defines: {
    ...LIGHT_PINS.defines,
    ...BASIC_PINS.defines,
    SYNTH_PIN: 10,
  },
  matrix: true,
  includes: [
    '#include <Adafruit_GFX.h>',
    '#include <Adafruit_NeoMatrix.h>',
    '#include <Adafruit_NeoPixel.h>',
    '#include <FastLED.h>',
  ],
};

function pinsForKit(kit: Kit): PinProfile {
  switch (kit) {
    case 'Basic':
      return BASIC_PINS;
    case 'Mobile':
      return MOBILE_PINS;
    case 'Start':
      return START_PINS;
    case 'Light':
    default:
      return LIGHT_PINS;
  }
}

function indent(level: number): string {
  return '  '.repeat(level);
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cppString(value: unknown): string {
  return JSON.stringify(String(value ?? ''));
}

function parsePixels(value: unknown): string[] {
  const parts = String(value ?? '')
    .split(/[;\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const pixels: string[] = [];
  for (let index = 0; index < 64; index += 1) {
    pixels.push(parts[index] && COLORS[parts[index]] !== undefined ? parts[index] : 'none');
  }
  return pixels;
}

function matrixTextCode(block: Blockly.Block, level: number): string[] {
  const colour = String(block.getFieldValue('COLOUR') ?? '#ffffff');
  const speed = Math.max(0, numberValue(block.getFieldValue('SPEED'), 125));
  const text = String(block.getFieldValue('TEXT') ?? '');
  const [r, g, b] = hexToRgb(colour);
  return [
    `${indent(level)}matrix.fillScreen(0);`,
    `${indent(level)}matrix.setCursor(0, 0);`,
    `${indent(level)}matrix.setTextColor(matrix.Color(${r}, ${g}, ${b}));`,
    `${indent(level)}matrix.print(${cppString(text)});`,
    `${indent(level)}matrix.show();`,
    `${indent(level)}delay(${speed});`,
  ];
}

function matrixDrawCode(block: Blockly.Block, level: number): string[] {
  const pixels = parsePixels(block.getFieldValue('PIXELS'));
  const lines = [`${indent(level)}matrix.fillScreen(0);`];
  pixels.forEach((name, index) => {
    if (name === 'none') {
      return;
    }
    const rgb = COLORS[name];
    if (!rgb) {
      return;
    }
    lines.push(
      `${indent(level)}matrix.setPixelColor(${index}, matrix.Color(${rgb[0]}, ${rgb[1]}, ${rgb[2]}));`,
    );
  });
  lines.push(`${indent(level)}matrix.show();`);
  return lines;
}

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '').padEnd(6, '0').slice(0, 6);
  const parsed = Number.parseInt(cleaned, 16);
  if (Number.isNaN(parsed)) {
    return [0, 0, 0];
  }
  return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
}

function emitBlock(block: Blockly.Block, level: number): string[] {
  const prefix = indent(level);
  switch (block.type) {
    case 'graphz_start':
      return [`${prefix}// start`];
    case 'graphz_timer': {
      const centiseconds = Math.max(0, numberValue(block.getFieldValue('DURATION'), 0));
      return [`${prefix}delay(${Math.round(centiseconds * 100)});`];
    }
    case 'graphz_loop': {
      const iterations = Math.max(1, Math.round(numberValue(block.getFieldValue('ITERATIONS'), 1)));
      const lines = [`${prefix}for (int i = 0; i < ${iterations}; i++) {`];
      const body = block.getInputTargetBlock('DO');
      if (body) {
        lines.push(...emitChain(body, level + 1));
      }
      lines.push(`${prefix}}`);
      return lines;
    }
    case 'graphz_led_matrix_text':
      return matrixTextCode(block, level);
    case 'graphz_led_matrix_draw':
      return matrixDrawCode(block, level);
    case 'graphz_led_matrix_template': {
      const template = String(block.getFieldValue('TEMPLATE') ?? 'Rainbow');
      return [`${prefix}// LED matrix template: ${template} (rendered on hardware)`];
    }
    case 'graphz_lamp': {
      const action = numberValue(block.getFieldValue('ACTION'), 0);
      const value = String(block.getFieldValue('VALUE') ?? 'null');
      if (action === 4 && value.trim() !== '' && value.trim() !== 'null') {
        return [`${prefix}analogWrite(LAMP_PIN, ${Math.max(0, Math.min(255, numberValue(value)))});`];
      }
      return [`${prefix}digitalWrite(LAMP_PIN, ${action === 0 ? 'LOW' : 'HIGH'});`];
    }
    case 'graphz_rgb': {
      const action = numberValue(block.getFieldValue('ACTION'), 0);
      const value = String(block.getFieldValue('VALUE') ?? 'null');
      return [`${prefix}setRgb(${action}, ${cppString(value)}); // kit-specific RGB output`];
    }
    case 'graphz_traffic_light': {
      const action = numberValue(block.getFieldValue('ACTION'), 1);
      return [`${prefix}setTrafficLight(${action});`];
    }
    case 'graphz_universal_indicator': {
      const value = numberValue(block.getFieldValue('VALUE'), 10);
      return [`${prefix}setIndicator(${Math.max(0, Math.min(255, value))});`];
    }
    case 'graphz_diode_red': {
      const action = numberValue(block.getFieldValue('ACTION'), 1);
      return [`${prefix}digitalWrite(RED_DIODE_PIN, ${action === 0 ? 'LOW' : 'HIGH'});`];
    }
    case 'graphz_diode_blue': {
      const action = numberValue(block.getFieldValue('ACTION'), 1);
      return [`${prefix}digitalWrite(BLUE_DIODE_PIN, ${action === 0 ? 'LOW' : 'HIGH'});`];
    }
    case 'graphz_motor': {
      const action = numberValue(block.getFieldValue('ACTION'), 1);
      const speed = Math.max(0, Math.min(255, numberValue(block.getFieldValue('VALUE'), 100)));
      return [
        `${prefix}digitalWrite(MOTOR_DIR_PIN, ${action === 0 ? 'LOW' : 'HIGH'});`,
        `${prefix}analogWrite(MOTOR_PWM_PIN, ${speed});`,
      ];
    }
    case 'graphz_synth': {
      const value = Math.max(0, numberValue(block.getFieldValue('VALUE'), 440));
      return [`${prefix}tone(SYNTH_PIN, ${value});`];
    }
    default:
      return [`${prefix}// Unsupported block type: ${block.type}`];
  }
}

function emitChain(first: Blockly.Block | null, level: number): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  let current: Blockly.Block | null = first;
  while (current) {
    if (seen.has(current.id)) {
      lines.push(`${indent(level)}// cycle detected at ${current.type}`);
      break;
    }
    seen.add(current.id);
    lines.push(...emitBlock(current, level));
    current = current.getNextBlock();
  }
  return lines;
}

export function generateCpp(workspace: Blockly.WorkspaceSvg, kit: Kit): string {
  const pins = pinsForKit(kit);
  const topBlocks = workspace.getTopBlocks(true);
  const starts = topBlocks.filter((block) => block.type === 'graphz_start');
  const roots = starts.length > 0 ? starts : topBlocks;

  const setup: string[] = [];
  for (const [name, pin] of Object.entries(pins.defines)) {
    setup.push(`  pinMode(${pin}, OUTPUT);`);
  }

  const loopLines: string[] = [];
  for (const root of roots) {
    loopLines.push(...emitChain(root, 1));
    loopLines.push('');
  }

  const lines: string[] = [
    '// Preview generated by the GraphZ Blockly editor.',
    `// Kit: ${kit}. Review pin profiles before uploading.`,
    '',
    ...pins.includes,
    '#include <Arduino.h>',
    '',
    ...Object.entries(pins.defines).map(([name, pin]) => `#define ${name} ${pin}`),
    '',
  ];

  if (pins.matrix) {
    lines.push(
      'Adafruit_NeoMatrix matrix = Adafruit_NeoMatrix(',
      '  8, 8, MATRIX_DATA_PIN,',
      '  NEO_MATRIX_BOTTOM + NEO_MATRIX_RIGHT + NEO_MATRIX_ROWS + NEO_MATRIX_PROGRESSIVE,',
      '  NEO_GRB + NEO_KHZ800);',
      '',
    );
  }

  lines.push(
    'void setup() {',
    ...setup,
  );
  if (pins.matrix) {
    lines.push('  matrix.begin();', '  matrix.setBrightness(10);');
  }
  lines.push('}', '', 'void loop() {', ...loopLines, '}');

  return lines.join('\n');
}
