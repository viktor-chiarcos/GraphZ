import * as Blockly from 'blockly/core';
import {
  BLOCKS_BY_GRAPHZ_TYPE,
  BLOCKS_BY_TYPE,
  type GraphZRecord,
} from '../blocks/registry';
import type { Kit, Mode } from '../spec';
import { parseGraphZ } from './parse';

export interface ExportOptions {
  kit: Kit;
  circuitId: string;
  mode: Mode;
}

export interface ImportResult {
  schemeId?: string;
  mode?: Mode;
}

const BASE_FIELDS: GraphZRecord = {
  DiamondBlock: 'null',
  OutputLineFromOrientation: 'null',
  OutputLineToOrientation: 'null',
  RealCoordsX: '0',
  RealCoordsY: '0',
  ActionOptionValue: 'null',
  SubParams: 'null',
};

function isSchemeObject(value: unknown): value is GraphZRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as GraphZRecord;
  return 'SchemeId' in record || 'SchemeMode' in record;
}

function asText(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  return String(value);
}

export function exportGraphZ(workspace: Blockly.WorkspaceSvg, options: ExportOptions): string {
  const records: GraphZRecord[] = [
    { SchemeId: options.circuitId, SchemeMode: options.mode },
  ];

  const tags = new Map<string, string>();
  let counter = 0;

  const tagFor = (block: Blockly.Block, graphzType: string, role = ''): string => {
    const key = `${block.id}:${role || graphzType}`;
    const existing = tags.get(key);
    if (existing) {
      return existing;
    }
    counter += 1;
    const tag = `${graphzType}${counter}`;
    tags.set(key, tag);
    return tag;
  };

  const graphzTypeFor = (block: Blockly.Block | null): string | undefined => {
    if (!block) {
      return undefined;
    }
    if (block.type === 'graphz_loop') {
      return 'PairBlock';
    }
    return BLOCKS_BY_TYPE.get(block.type)?.graphzType;
  };

  const convertChain = (
    first: Blockly.Block | null,
  ): { records: GraphZRecord[]; headTag?: string } => {
    const chainRecords: GraphZRecord[] = [];
    const seen = new Set<string>();
    let current: Blockly.Block | null = first;
    let headTag: string | undefined;

    while (current) {
      if (seen.has(current.id)) {
        break;
      }
      seen.add(current.id);

      if (current.type === 'graphz_loop') {
        const pairTag = tagFor(current, 'PairBlock', 'pair');
        const lowerTag = tagFor(current, 'PairLowerBlock', 'lower');
        headTag ??= pairTag;

        const body = convertChain(current.getInputTargetBlock('DO'));
        const after = convertChain(current.getNextBlock());

        const pairRecord: GraphZRecord = {
          ...BASE_FIELDS,
          BlockType: 'PairBlock',
          BlockConnectionTag: pairTag,
          OutputLine: pairTag,
          IterationsPairBlock: asText(current.getFieldValue('ITERATIONS')),
        };
        const lowerRecord: GraphZRecord = {
          ...BASE_FIELDS,
          BlockType: 'PairLowerBlock',
          BlockConnectionTag: lowerTag,
          OutputLine: after.headTag ?? 'null',
        };

        if (body.records.length > 0) {
          body.records[body.records.length - 1].OutputLine = lowerTag;
        }

        chainRecords.push(pairRecord, ...body.records, lowerRecord, ...after.records);
        break;
      }

      const def = BLOCKS_BY_TYPE.get(current.type);
      if (!def) {
        current = current.getNextBlock();
        continue;
      }

      const tag = tagFor(current, def.graphzType);
      headTag ??= tag;

      const next = current.getNextBlock();
      const nextType = graphzTypeFor(next);
      const nextTag = next && nextType ? tagFor(next, nextType, next.type === 'graphz_loop' ? 'pair' : '') : 'null';

      chainRecords.push({
        ...BASE_FIELDS,
        ...def.toGraphZ(current),
        BlockType: def.graphzType,
        BlockConnectionTag: tag,
        OutputLine: nextTag,
      });

      current = next;
    }

    return { records: chainRecords, headTag };
  };

  for (const root of workspace.getTopBlocks(true)) {
    const converted = convertChain(root);
    records.push(...converted.records);
  }

  return JSON.stringify(records, null, 2).replace(/\n/g, '\r\n');
}

export function importGraphZ(workspace: Blockly.WorkspaceSvg, text: string): ImportResult {
  const data = parseGraphZ(text);
  if (!Array.isArray(data)) {
    throw new Error('A .gphz file must contain a JSON array.');
  }

  const metadata: GraphZRecord = {};
  const blockRecords: GraphZRecord[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') {
      throw new Error('Every .gphz array element must be an object.');
    }
    if (isSchemeObject(item)) {
      Object.assign(metadata, item);
    } else {
      blockRecords.push(item as GraphZRecord);
    }
  }

  const byTag = new Map<string, GraphZRecord>();
  for (const record of blockRecords) {
    const tag = asText(record.BlockConnectionTag);
    if (tag !== 'null') {
      byTag.set(tag, record);
    }
  }

  const incoming = new Map<string, string[]>();
  for (const record of blockRecords) {
    const tag = asText(record.BlockConnectionTag);
    const target = asText(record.OutputLine);
    if (tag === 'null' || target === 'null' || !byTag.has(target)) {
      continue;
    }
    const list = incoming.get(target) ?? [];
    list.push(tag);
    incoming.set(target, list);
  }

  const pairLowers = blockRecords.filter((record) => asText(record.BlockType) === 'PairLowerBlock');
  const usedLowers = new Set<string>();

  const findPairLower = (): GraphZRecord | undefined => {
    const candidate = pairLowers.find((record) => !usedLowers.has(asText(record.BlockConnectionTag)));
    if (candidate) {
      usedLowers.add(asText(candidate.BlockConnectionTag));
    }
    return candidate;
  };

  const findBodyHead = (lowerTag: string): string | null => {
    const tail = blockRecords.find((record) => asText(record.OutputLine) === lowerTag);
    if (!tail) {
      return null;
    }
    let currentTag = asText(tail.BlockConnectionTag);
    const seen = new Set<string>();
    while (currentTag !== 'null' && !seen.has(currentTag)) {
      seen.add(currentTag);
      const parents = (incoming.get(currentTag) ?? []).filter((parentTag) => {
        const parent = byTag.get(parentTag);
        const type = parent ? asText(parent.BlockType) : '';
        return type !== 'PairBlock' && type !== 'PairLowerBlock';
      });
      if (parents.length === 0) {
        return currentTag;
      }
      currentTag = parents[0];
    }
    return currentTag === 'null' ? null : currentTag;
  };

  const visited = new Set<string>();

  const createBlock = (graphzType: string): Blockly.BlockSvg | null => {
    const def = BLOCKS_BY_GRAPHZ_TYPE.get(graphzType);
    if (!def) {
      return null;
    }
    const block = workspace.newBlock(def.type) as Blockly.BlockSvg;
    block.initSvg();
    block.render();
    return block;
  };

  const buildChain = (
    startTag: string | null,
    stopTag?: string,
  ): Blockly.BlockSvg | null => {
    if (!startTag || startTag === 'null' || startTag === stopTag || visited.has(startTag)) {
      return null;
    }
    const record = byTag.get(startTag);
    if (!record) {
      return null;
    }
    visited.add(startTag);

    const graphzType = asText(record.BlockType);
    if (graphzType === 'PairBlock') {
      const lower = findPairLower();
      const lowerTag = lower ? asText(lower.BlockConnectionTag) : '';
      const bodyHead = lowerTag ? findBodyHead(lowerTag) : null;
      const loop = createBlock('PairBlock');
      if (!loop) {
        return null;
      }
      loop.setFieldValue(asText(record.IterationsPairBlock ?? '1'), 'ITERATIONS');
      const body = buildChain(bodyHead, lowerTag || undefined);
      if (body && loop.getInput('DO')?.connection) {
        loop.getInput('DO')!.connection!.connect(body.previousConnection!);
      }
      const after = buildChain(lower ? asText(lower.OutputLine) : null);
      if (after && loop.nextConnection) {
        loop.nextConnection.connect(after.previousConnection!);
      }
      return loop;
    }

    const block = createBlock(graphzType);
    if (!block) {
      return null;
    }
    const def = BLOCKS_BY_GRAPHZ_TYPE.get(graphzType)!;
    def.applyGraphZ(block, record);

    const next = buildChain(asText(record.OutputLine));
    if (next && block.nextConnection) {
      block.nextConnection.connect(next.previousConnection!);
    }
    return block;
  };

  workspace.clear();
  Blockly.Events.disable();
  try {
    const roots = blockRecords.filter(
      (record) => asText(record.BlockType) === 'Start' && asText(record.ChosenActionIndex) === '-1',
    );
    const rootRecords = roots.length > 0
      ? roots
      : blockRecords.filter((record) => {
        const tag = asText(record.BlockConnectionTag);
        return asText(record.BlockType) !== 'PairLowerBlock' && (incoming.get(tag) ?? []).length === 0;
      });

    let offset = 40;
    for (const root of rootRecords) {
      const tag = asText(root.BlockConnectionTag);
      if (visited.has(tag)) {
        continue;
      }
      const block = buildChain(tag);
      if (block) {
        block.moveBy(40, offset);
        offset += 160;
      }
    }

    for (const record of blockRecords) {
      const tag = asText(record.BlockConnectionTag);
      if (visited.has(tag) || asText(record.BlockType) === 'PairLowerBlock') {
        continue;
      }
      const block = buildChain(tag);
      if (block) {
        block.moveBy(420, offset);
        offset += 160;
      }
    }
  } finally {
    Blockly.Events.enable();
  }

  const schemeMode = asText(metadata.SchemeMode);
  return {
    schemeId: metadata.SchemeId === undefined ? undefined : asText(metadata.SchemeId),
    mode: schemeMode === 'Newbie' || schemeMode === 'Expert' ? schemeMode : undefined,
  };
}
