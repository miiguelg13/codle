import type { CompareMode } from './types.js';

const EPS = 1e-6;

function numEq(a: number, b: number): boolean {
  if (Number.isInteger(a) && Number.isInteger(b)) return a === b;
  const diff = Math.abs(a - b);
  return diff <= EPS || diff <= EPS * Math.max(Math.abs(a), Math.abs(b));
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') return numEq(a, b);
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  return a === b;
}

function canon(v: unknown): string {
  return JSON.stringify(v);
}

function sortDeep(v: unknown): unknown {
  if (!Array.isArray(v)) return v;
  const inner = v.map(sortDeep);
  return inner.sort((x, y) => {
    if (typeof x === 'number' && typeof y === 'number') return x - y;
    const cx = canon(x);
    const cy = canon(y);
    return cx < cy ? -1 : cx > cy ? 1 : 0;
  });
}

function sortTop(v: unknown): unknown {
  if (!Array.isArray(v)) return v;
  return [...v].sort((x, y) => {
    if (typeof x === 'number' && typeof y === 'number') return x - y;
    const cx = canon(x);
    const cy = canon(y);
    return cx < cy ? -1 : cx > cy ? 1 : 0;
  });
}

export function outputsMatch(expected: unknown, actual: unknown, mode: CompareMode): boolean {
  switch (mode) {
    case 'exact':
      return deepEqual(expected, actual);
    case 'unordered':
      return deepEqual(sortTop(expected), sortTop(actual));
    case 'unordered-deep':
      return deepEqual(sortDeep(expected), sortDeep(actual));
  }
}
