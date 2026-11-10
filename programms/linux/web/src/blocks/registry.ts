import * as Blockly from 'blockly/core';
import {
  COLOR_OPTIONS,
  COLOR_NAMES,
  formatTriplet,
  hexToRgb,
  nearestColorName,
  namedColorToRgb,
  tripletToHex,
  type Kit,
  type Mode,
} from '../spec';

export interface GraphZRecord {
  [key: string]: unknown;
}

export interface BlockDef {
  type: string;
  graphzType: string;
  category: string;
  kits: Kit[];
  modes: Mode[];
  json: Record<string, unknown>;
  toGraphZ(block: Blockly.Block): GraphZRecord;
  applyGraphZ(block: Blockly.Block, record: GraphZRecord): void;
}

export interface CategoryDef {
  name: string;
  colour: string;
  blocks: string[];
}

const ALL_KITS: Kit[] = ['Light', 'Start', 'Basic', 'Mobile'];
const BOTH_MODES: Mode[] = ['Newbie', 'Expert'];

const LIGHT_KITS: Kit[] = ['Light', 'Start', 'Mobile'];
const BASIC_KITS: Kit[] = ['Basic', 'Start'];
const MOBILE_KITS: Kit[] = ['Mobile', 'Start'];

function fieldNumber(name: string, value: number, extra: Record<string, unknown> = {}) {
  return { type: 'field_number', name, value, ...extra };
}

function fieldInput(name: string, text: string) {
  return { type: 'field_input', name, text };
}

function fieldColour(name: string, colour: string) {
  return { type: 'field_colour', name, colour };
}

function fieldDropdown(name: string, options: Array<[string, string]>, value?: string) {
  return { type: 'field_dropdown', name, options, ...(value ? { value } : {}) };
}

function statementInput(name: string) {
  return { type: 'input_statement', name };
}

function actionBlock(options: {
  type: string;
  graphzType: string;
  label: string;
  category: string;
  kits: Kit[];
  colour: number;
  defaultAction?: number;
  defaultValue?: string;
  actionLabel?: string;
  valueLabel?: string;
}): BlockDef {
  const {
    type,
    graphzType,
    label,
    category,
    kits,
    colour,
    defaultAction = 0,
    defaultValue = 'null',
    actionLabel = 'action',
    valueLabel = 'value',
  } = options;

  return {
    type,
    graphzType,
    category,
    kits,
    modes: BOTH_MODES,
    json: {
      type,
      message0: `${label} ${actionLabel} %1 ${valueLabel} %2`,
      args0: [
        fieldNumber('ACTION', defaultAction),
        fieldInput('VALUE', defaultValue),
      ],
      previousStatement: null,
      nextStatement: null,
      colour,
      tooltip: `GraphZ ${graphzType} block. Action and value are preserved for .gphz round-trips.`,
    },
    toGraphZ(block) {
      return {
        BlockType: graphzType,
        ChosenActionIndex: String(block.getFieldValue('ACTION') ?? defaultAction),
        MaskedTextBoxValue: String(block.getFieldValue('VALUE') ?? defaultValue),
        ActionOptionValue: 'null',
        SubParams: 'null',
      };
    },
    applyGraphZ(block, record) {
      const action = record.ChosenActionIndex;
      const value = record.MaskedTextBoxValue;
      block.setFieldValue(action === null || action === undefined ? String(defaultAction) : String(action), 'ACTION');
      block.setFieldValue(value === null || value === undefined ? defaultValue : String(value), 'VALUE');
    },
  };
}

function normalizePixels(input: string): string {
  const parts = input
    .split(/[;\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const normalized: string[] = [];
  for (let index = 0; index < 64; index += 1) {
    const name = parts[index];
    normalized.push(name && COLOR_NAMES.includes(name) ? name : 'none');
  }
  return normalized.join(';') + ';';
}

function parseSubParams(value: unknown): string[] {
  return String(value ?? '').split(';');
}

export const BLOCK_DEFS: BlockDef[] = [
  {
    type: 'graphz_start',
    graphzType: 'Start',
    category: 'Start',
    kits: ALL_KITS,
    modes: BOTH_MODES,
    json: {
      type: 'graphz_start',
      message0: 'start',
      nextStatement: null,
      colour: 330,
      hat: 'cap',
      tooltip: 'Program entry point. GraphZ stores ChosenActionIndex = "-1".',
    },
    toGraphZ() {
      return {
        BlockType: 'Start',
        ChosenActionIndex: '-1',
        MaskedTextBoxValue: 'null',
        ActionOptionValue: 'null',
        SubParams: 'null',
      };
    },
    applyGraphZ() {
      // Start has no editable fields.
    },
  },
  {
    type: 'graphz_timer',
    graphzType: 'Timer',
    category: 'Control',
    kits: ALL_KITS,
    modes: BOTH_MODES,
    json: {
      type: 'graphz_timer',
      message0: 'wait %1 centiseconds',
      args0: [fieldNumber('DURATION', 10, { min: 0, precision: 1 })],
      previousStatement: null,
      nextStatement: null,
      colour: 120,
      tooltip: 'GraphZ timer. The stored value is centiseconds; C++ uses centiseconds x 100 ms.',
    },
    toGraphZ(block) {
      return {
        BlockType: 'Timer',
        ChosenActionIndex: '1',
        MaskedTextBoxValue: String(block.getFieldValue('DURATION') ?? 10),
        ActionOptionValue: 'null',
        SubParams: 'null',
      };
    },
    applyGraphZ(block, record) {
      block.setFieldValue(String(record.MaskedTextBoxValue ?? '10'), 'DURATION');
    },
  },
  {
    type: 'graphz_loop',
    graphzType: 'PairBlock',
    category: 'Control',
    kits: ALL_KITS,
    modes: BOTH_MODES,
    json: {
      type: 'graphz_loop',
      message0: 'repeat %1 times',
      args0: [fieldNumber('ITERATIONS', 4, { min: 1, precision: 1 })],
      message1: 'do %1',
      args1: [statementInput('DO')],
      previousStatement: null,
      nextStatement: null,
      colour: 160,
      tooltip: 'GraphZ PairBlock / PairLowerBlock loop. Body blocks run the given number of times.',
    },
    toGraphZ(block) {
      return {
        BlockType: 'PairBlock',
        IterationsPairBlock: String(block.getFieldValue('ITERATIONS') ?? 1),
        ChosenActionIndex: 'null',
        MaskedTextBoxValue: 'null',
        ActionOptionValue: 'null',
        SubParams: 'null',
      };
    },
    applyGraphZ(block, record) {
      block.setFieldValue(String(record.IterationsPairBlock ?? '1'), 'ITERATIONS');
    },
  },
  {
    type: 'graphz_led_matrix_text',
    graphzType: 'LEDMatrixText',
    category: 'LED Matrix',
    kits: LIGHT_KITS,
    modes: BOTH_MODES,
    json: {
      type: 'graphz_led_matrix_text',
      message0: 'show text %1',
      args0: [fieldInput('TEXT', 'Hello World')],
      message1: 'colour %1 speed %2',
      args1: [fieldColour('COLOUR', '#ffffff'), fieldNumber('SPEED', 125, { min: 0 })],
      previousStatement: null,
      nextStatement: null,
      colour: 230,
      tooltip: 'GraphZ LEDMatrixText. SubParams = r,g,b;speed;text;',
    },
    toGraphZ(block) {
      const colour = String(block.getFieldValue('COLOUR') ?? '#ffffff');
      const speed = String(block.getFieldValue('SPEED') ?? 125);
      const text = String(block.getFieldValue('TEXT') ?? '');
      return {
        BlockType: 'LEDMatrixText',
        ChosenActionIndex: '-1',
        MaskedTextBoxValue: 'null',
        ActionOptionValue: 'null',
        SubParams: `${formatTriplet(colour)};${speed};${text};`,
      };
    },
    applyGraphZ(block, record) {
      const parts = parseSubParams(record.SubParams);
      const colour = tripletToHex(parts[0]);
      const speed = parts[1]?.trim() || '125';
      const text = parts.slice(2).join(';').replace(/;$/, '');
      block.setFieldValue(colour, 'COLOUR');
      block.setFieldValue(speed, 'SPEED');
      block.setFieldValue(text, 'TEXT');
    },
  },
  {
    type: 'graphz_led_matrix_draw',
    graphzType: 'LEDMatrixDraw',
    category: 'LED Matrix',
    kits: LIGHT_KITS,
    modes: BOTH_MODES,
    json: {
      type: 'graphz_led_matrix_draw',
      message0: 'draw matrix %1',
      args0: [
        {
          type: 'field_input',
          name: 'PIXELS',
          text: normalizePixels(''),
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 230,
      tooltip: '64 colour names in row-major order, separated by semicolons. Use "Edit matrix" for a grid editor.',
    },
    toGraphZ(block) {
      return {
        BlockType: 'LEDMatrixDraw',
        ChosenActionIndex: '-1',
        MaskedTextBoxValue: 'null',
        ActionOptionValue: 'null',
        SubParams: normalizePixels(String(block.getFieldValue('PIXELS') ?? '')),
      };
    },
    applyGraphZ(block, record) {
      block.setFieldValue(normalizePixels(String(record.SubParams ?? '')), 'PIXELS');
    },
  },
  {
    type: 'graphz_led_matrix_template',
    graphzType: 'LEDMatrixTemplate',
    category: 'LED Matrix',
    kits: LIGHT_KITS,
    modes: BOTH_MODES,
    json: {
      type: 'graphz_led_matrix_template',
      message0: 'show template %1',
      args0: [fieldInput('TEMPLATE', 'Rainbow')],
      previousStatement: null,
      nextStatement: null,
      colour: 230,
      tooltip: 'GraphZ LEDMatrixTemplate. Known samples: Rainbow, Spiral, Smile.',
    },
    toGraphZ(block) {
      return {
        BlockType: 'LEDMatrixTemplate',
        ChosenActionIndex: '-1',
        MaskedTextBoxValue: 'null',
        ActionOptionValue: 'null',
        SubParams: String(block.getFieldValue('TEMPLATE') ?? 'Rainbow'),
      };
    },
    applyGraphZ(block, record) {
      block.setFieldValue(String(record.SubParams ?? 'Rainbow'), 'TEMPLATE');
    },
  },
  actionBlock({
    type: 'graphz_lamp',
    graphzType: 'Lamp',
    label: 'lamp',
    category: 'Lights',
    kits: ALL_KITS,
    colour: 45,
    defaultAction: 0,
    defaultValue: 'null',
  }),
  actionBlock({
    type: 'graphz_rgb',
    graphzType: 'RGB',
    label: 'RGB',
    category: 'Lights',
    kits: ALL_KITS,
    colour: 20,
    defaultAction: 0,
    defaultValue: 'null',
  }),
  actionBlock({
    type: 'graphz_traffic_light',
    graphzType: 'TrafficLight',
    label: 'traffic light',
    category: 'Lights',
    kits: BASIC_KITS,
    colour: 0,
    defaultAction: 1,
    defaultValue: 'null',
  }),
  actionBlock({
    type: 'graphz_universal_indicator',
    graphzType: 'UniversalIndicator',
    label: 'indicator',
    category: 'Lights',
    kits: ALL_KITS,
    colour: 280,
    defaultAction: 0,
    defaultValue: '10',
    actionLabel: 'mode',
    valueLabel: 'brightness',
  }),
  actionBlock({
    type: 'graphz_diode_red',
    graphzType: 'DiodeRed1',
    label: 'red diode',
    category: 'Lights',
    kits: BASIC_KITS,
    colour: 355,
    defaultAction: 1,
    defaultValue: 'null',
  }),
  actionBlock({
    type: 'graphz_diode_blue',
    graphzType: 'DiodeBlue1',
    label: 'blue diode',
    category: 'Lights',
    kits: BASIC_KITS,
    colour: 210,
    defaultAction: 1,
    defaultValue: 'null',
  }),
  actionBlock({
    type: 'graphz_motor',
    graphzType: 'Motor',
    label: 'motor',
    category: 'Motion',
    kits: ['Basic', 'Start', 'Mobile'],
    colour: 180,
    defaultAction: 1,
    defaultValue: '100',
    actionLabel: 'action',
    valueLabel: 'speed',
  }),
  actionBlock({
    type: 'graphz_synth',
    graphzType: 'Synth',
    label: 'synth',
    category: 'Sound',
    kits: MOBILE_KITS,
    colour: 290,
    defaultAction: 2,
    defaultValue: '440',
    actionLabel: 'action',
    valueLabel: 'value',
  }),
];

export const CATEGORIES: CategoryDef[] = [
  { name: 'Start', colour: '#b23c3c', blocks: ['graphz_start'] },
  { name: 'Control', colour: '#2c6fbb', blocks: ['graphz_timer', 'graphz_loop'] },
  {
    name: 'LED Matrix',
    colour: '#7d3c98',
    blocks: ['graphz_led_matrix_text', 'graphz_led_matrix_draw', 'graphz_led_matrix_template'],
  },
  {
    name: 'Lights',
    colour: '#d68910',
    blocks: [
      'graphz_lamp',
      'graphz_rgb',
      'graphz_traffic_light',
      'graphz_universal_indicator',
      'graphz_diode_red',
      'graphz_diode_blue',
    ],
  },
  { name: 'Motion', colour: '#1e8449', blocks: ['graphz_motor'] },
  { name: 'Sound', colour: '#148f77', blocks: ['graphz_synth'] },
];

export const BLOCKS_BY_TYPE = new Map(BLOCK_DEFS.map((def) => [def.type, def]));
export const BLOCKS_BY_GRAPHZ_TYPE = new Map(BLOCK_DEFS.map((def) => [def.graphzType, def]));

export function isBlockAvailable(def: BlockDef, kit: Kit, mode: Mode): boolean {
  return def.kits.includes(kit) && def.modes.includes(mode);
}

export function colorOptionsWithPreview(): Array<[string, string]> {
  return COLOR_OPTIONS.map(([label, value]) => {
    const rgb = namedColorToRgb(value);
    const suffix = rgb ? ` (${rgb.join(',')})` : '';
    return [`${label}${suffix}`, value];
  });
}

export function findNearestNamedColor(hex: string): string {
  return nearestColorName(formatTriplet(hex));
}

export { hexToRgb };
