import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../config.js';
import { validateSignature, validateTestCase, type Signature, type TestCase } from '../harness/types.js';
import { encodeCase, Problem } from '../models/Problem.js';
import { Progress } from '../models/Progress.js';
import { addDays, today } from '../services/dates.js';

interface SeedProblem {
  slug: string;
  dayOffset: number;
  level: number;
  signature: Signature;
  examples: TestCase[];
  tests: TestCase[];
  [k: string]: unknown;
}

export const SEED_FILE = path.join(ROOT, 'server', 'src', 'seed', 'problems.json');

export async function seedExamples(opts: { ifNeeded?: boolean } = {}): Promise<number> {
  const data: SeedProblem[] = JSON.parse(readFileSync(SEED_FILE, 'utf8'));
  const t = today();

  for (const p of data) {
    const sigErr = validateSignature(p.signature);
    if (sigErr) throw new Error(`${p.slug}: ${sigErr}`);
    [...p.examples, ...p.tests].forEach((tc, i) => {
      const err = validateTestCase(p.signature, tc, `${p.slug}#${i}`);
      if (err) throw new Error(err);
    });
  }

  if (opts.ifNeeded) {
    const hasToday = await Problem.exists({ date: t, status: 'published' });
    if (hasToday) {
      console.log(`[seed] ya hay retos para hoy (${t}), no hace falta cargar los de ejemplo`);
      await backfillEditorials(data);
      return 0;
    }
  }
  const old = await Problem.find({ source: 'seed' }).select('_id');
  await Progress.deleteMany({ problemId: { $in: old.map((o) => o._id) } });
  await Problem.deleteMany({ source: 'seed' });

  const docs = data.map(({ dayOffset, ...p }) => ({
    ...p,
    examples: p.examples.map(encodeCase),
    tests: p.tests.map(encodeCase),
    date: addDays(t, dayOffset),
    status: 'published',
    source: 'seed',
  }));
  let inserted = 0;
  for (const d of docs) {
    const clash = await Problem.exists({ date: d.date, level: d.level, status: 'published' });
    if (clash) continue;
    await Problem.create(d);
    inserted++;
  }
  console.log(`[seed] ${inserted} retos de ejemplo insertados para ${[...new Set(docs.map((d) => d.date))].join(', ')}`);
  return inserted;
}

async function backfillEditorials(data: SeedProblem[]): Promise<void> {
  let n = 0;
  for (const p of data) {
    const e = p.editorial as { es: string; en: string } | undefined;
    if (!e) continue;
    const r = await Problem.updateMany(
      { source: 'seed', slug: p.slug, 'editorial.es': { $in: [null, ''] } },
      { $set: { editorial: e } },
    );
    n += r.modifiedCount;
  }
  if (n) console.log(`[seed] explicación añadida a ${n} retos de ejemplo`);
}
