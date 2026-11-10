import type { Kit, Mode } from '../spec';
import { BLOCKS_BY_TYPE, CATEGORIES, isBlockAvailable } from './registry';

export function buildToolbox(kit: Kit, mode: Mode): Record<string, unknown> {
  const contents = CATEGORIES.map((category) => {
    const blocks = category.blocks
      .map((type) => BLOCKS_BY_TYPE.get(type))
      .filter((def): def is NonNullable<typeof def> => Boolean(def))
      .filter((def) => isBlockAvailable(def, kit, mode))
      .map((def) => ({ kind: 'block', type: def.type }));

    return {
      kind: 'category',
      name: category.name,
      colour: category.colour,
      contents: blocks,
    };
  }).filter((category) => category.contents.length > 0);

  return { kind: 'categoryToolbox', contents };
}
