import { elementType, type Signature, type TestCase, type ValueType } from './types.js';

const encoder = new TextEncoder();

export function encodeValue(value: unknown, type: ValueType, out: string[]): void {
  const el = elementType(type);
  if (el) {
    const arr = value as unknown[];
    out.push(String(arr.length));
    for (const v of arr) encodeValue(v, el, out);
    return;
  }
  switch (type) {
    case 'int':
    case 'long':
      out.push(String(Math.trunc(value as number)));
      return;
    case 'double':
      out.push(formatDouble(value as number));
      return;
    case 'bool':
      out.push(value ? '1' : '0');
      return;
    case 'string': {
      const bytes = encoder.encode(value as string);
      out.push(String(bytes.length));
      for (const b of bytes) out.push(String(b));
      return;
    }
  }
}

function formatDouble(n: number): string {
  return String(n);
}

export function encodeTests(sig: Signature, tests: TestCase[]): string {
  const lines: string[] = [String(tests.length)];
  for (const tc of tests) {
    const tokens: string[] = [];
    sig.params.forEach((p, i) => encodeValue(tc.input[i], p.type, tokens));
    lines.push(tokens.join(' '));
  }
  return lines.join('\n') + '\n';
}
