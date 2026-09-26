import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';
import { connectDb } from '../db.js';
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

async function main() {
  const data: SeedProblem[] = JSON.parse(readFileSync(new URL('./problems.json', import.meta.url), 'utf8'));
  const t = today();

  for (const p of data) {
    const sigErr = validateSignature(p.signature);
    if (sigErr) throw new Error(`${p.slug}: ${sigErr}`);
    [...p.examples, ...p.tests].forEach((tc, i) => {
      const err = validateTestCase(p.signature, tc, `${p.slug}#${i}`);
      if (err) throw new Error(err);
    });
  }

  await connectDb();
  if (process.argv.includes('--if-needed')) {
    const hasToday = await Problem.exists({ date: t, status: 'published' });
    if (hasToday) {
      console.log(`[seed] ya hay retos para hoy (${t}), no hace falta cargar los de ejemplo`);
      await mongoose.disconnect();
      return;
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
  const inserted = [];
  for (const d of docs) {
    const clash = await Problem.exists({ date: d.date, level: d.level, status: 'published' });
    if (clash) {
      console.log(`  - ${d.date} nivel ${d.level}: ya existe un reto publicado, se omite ${d.slug}`);
      continue;
    }
    inserted.push(await Problem.create(d));
  }
  console.log(`[seed] ${inserted.length} retos insertados para ${[...new Set(docs.map((d) => d.date))].join(', ')}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
