import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { mergeSolutions, publicSolutions, SOLUTION_EXT, validateSolutions, type StoredSolution } from '../harness/solutions.js';
import { LANGUAGES } from '../harness/types.js';
import { SEED_FILE, SEED_SOLUTIONS_DIR } from '../seed/examples.js';

test('mergeSolutions conserva la verificación de las que no cambian', () => {
  const old: StoredSolution[] = [
    { language: 'go', code: 'A', status: 'ok' },
    { language: 'rust', code: 'B', status: 'failed', error: 'x' },
  ];
  const merged = mergeSolutions(
    [
      { language: 'go', code: 'A' },
      { language: 'rust', code: 'B2' },
      { language: 'java', code: 'C' },
      { language: 'python', code: 'P' },
    ],
    old,
  );
  assert.deepEqual(
    merged.map((s) => [s.language, s.status]),
    [
      ['go', 'ok'],
      ['rust', 'pending'],
      ['java', 'pending'],
    ],
  );
  assert.equal(merged[1].error, undefined);
});

test('publicSolutions: referencia + verificadas, en orden de LANGUAGES', () => {
  const out = publicSolutions({ language: 'python', code: 'py' }, [
    { language: 'rust', code: 'rs', status: 'ok' },
    { language: 'go', code: 'go', status: 'failed' },
    { language: 'javascript', code: 'js', status: 'ok' },
    { language: 'java', code: 'java', status: 'pending' },
  ]);
  assert.deepEqual(
    out.map((s) => s.language),
    ['python', 'javascript', 'rust'],
  );
  assert.deepEqual(publicSolutions(null, undefined), []);
});

test('validateSolutions', () => {
  assert.equal(validateSolutions(undefined, 'x'), null);
  assert.equal(validateSolutions([{ language: 'go', code: 'func f() {}' }], 'x'), null);
  assert.match(validateSolutions([{ language: 'kotlin', code: 'x' }], 'x')!, /no válido/);
  assert.match(validateSolutions([{ language: 'go', code: '  ' }], 'x')!, /vacía/);
  assert.match(
    validateSolutions(
      [
        { language: 'go', code: 'a' },
        { language: 'go', code: 'b' },
      ],
      'x',
    )!,
    /repetida/,
  );
  assert.match(validateSolutions([{ language: 'python', code: 'x' }], 'x')!, /referenceSolution/);
});

test('cada reto de ejemplo tiene solución oficial en los 8 lenguajes', () => {
  const seed: { slug: string }[] = JSON.parse(readFileSync(SEED_FILE, 'utf8'));
  const missing: string[] = [];
  for (const p of seed)
    for (const lang of LANGUAGES) {
      if (lang === 'python') continue;
      if (!existsSync(path.join(SEED_SOLUTIONS_DIR, `${p.slug}.${SOLUTION_EXT[lang]}`))) missing.push(`${p.slug}.${SOLUTION_EXT[lang]}`);
    }
  assert.deepEqual(missing, []);
});
