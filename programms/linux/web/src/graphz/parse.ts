const VALID_ESCAPES = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);
const HEX_DIGITS = new Set('0123456789abcdefABCDEF');

export function parseGraphZ(text: string): unknown {
  let source = text.replace(/^\uFEFF/, '');
  try {
    return JSON.parse(source);
  } catch (firstError) {
    source = repairJsonText(source);
    try {
      return JSON.parse(source);
    } catch (secondError) {
      const message = secondError instanceof Error ? secondError.message : String(secondError);
      throw new Error(`Invalid .gphz JSON even after tolerant repair: ${message}`);
    }
  }
}

export function repairJsonText(text: string): string {
  const out: string[] = [];
  let inString = false;
  let index = 0;

  while (index < text.length) {
    const char = text[index];

    if (!inString) {
      out.push(char);
      if (char === '"') {
        inString = true;
      }
      index += 1;
      continue;
    }

    if (char === '\\') {
      const next = index + 1 < text.length ? text[index + 1] : '';
      if (next === 'u' && isHex(text, index + 2, 4)) {
        out.push(text.slice(index, index + 6));
        index += 6;
      } else if (next && VALID_ESCAPES.has(next)) {
        out.push(text.slice(index, index + 2));
        index += 2;
      } else {
        out.push('\\\\');
        index += 1;
      }
      continue;
    }

    if (char === '"') {
      if (endsString(text, index)) {
        out.push('"');
        inString = false;
      } else {
        out.push('\\"');
      }
      index += 1;
      continue;
    }

    out.push(escapeControl(char));
    index += 1;
  }

  return out.join('');
}

function endsString(text: string, quoteIndex: number): boolean {
  const next = nextSignificant(text, quoteIndex + 1);
  if (next >= text.length) {
    return true;
  }
  const following = text[next];
  if ('}]:'.includes(following)) {
    return true;
  }
  if (following === ',') {
    const afterComma = nextSignificant(text, next + 1);
    if (afterComma >= text.length) {
      return false;
    }
    return '"{['.includes(text[afterComma]);
  }
  return false;
}

function nextSignificant(text: string, index: number): number {
  while (index < text.length && ' \t\r\n'.includes(text[index])) {
    index += 1;
  }
  return index;
}

function isHex(text: string, start: number, count: number): boolean {
  const chunk = text.slice(start, start + count);
  return chunk.length === count && [...chunk].every((char) => HEX_DIGITS.has(char));
}

function escapeControl(char: string): string {
  const code = char.charCodeAt(0);
  if (code >= 0x20) {
    return char;
  }
  if (char === '\n') {
    return '\\n';
  }
  if (char === '\r') {
    return '\\r';
  }
  if (char === '\t') {
    return '\\t';
  }
  return `\\u${code.toString(16).padStart(4, '0')}`;
}
