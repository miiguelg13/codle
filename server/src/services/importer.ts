import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { validateSignature, validateTestCase, type Signature, type TestCase } from '../harness/types.js';
import { encodeCase, Problem } from '../models/Problem.js';
import { Progress } from '../models/Progress.js';
import { isValidDate, today } from './dates.js';

interface DayFile {
  date: string;
  hash?: string;
  problems: (Record<string, unknown> & {
    slug: string;
    level: number;
    signature: Signature;
    examples: TestCase[];
    tests: TestCase[];
    editorial?: { es: string; en: string };
  })[];
}

export interface ImportReport {
  imported: string[];
  updated: string[];
  skipped: string[];
  errors: string[];
}

function validateDay(day: DayFile, file: string): string | null {
  if (!isValidDate(day.date)) return `${file}: fecha inválida`;
  if (!Array.isArray(day.problems) || day.problems.length === 0) return `${file}: sin problemas`;
  for (const p of day.problems) {
    const label = `${file} ${p.slug}`;
    if (![1, 2, 3, 4].includes(p.level)) return `${label}: nivel inválido`;
    const sigErr = validateSignature(p.signature);
    if (sigErr) return `${label}: ${sigErr}`;
    const all = [...(p.examples ?? []), ...(p.tests ?? [])];
    if (all.length === 0) return `${label}: sin tests`;
    for (let i = 0; i < all.length; i++) {
      const err = validateTestCase(p.signature, all[i], `${label}#${i}`);
      if (err) return err;
    }
  }
  return null;
}

async function importDay(day: DayFile, file: string, report: ImportReport): Promise<void> {
  const hash = day.hash ?? createHash('sha256').update(JSON.stringify(day.problems)).digest('hex').slice(0, 16);
  const t = today();
  for (const p of day.problems) {
    const key = `${day.date} L${p.level} ${p.slug}`;
    const existing = await Problem.findOne({ date: day.date, level: p.level, status: 'published' })
      .select('_id slug source importHash')
      .lean<{ _id: unknown; slug: string; source: string; importHash?: string }>();

    const doc = {
      slug: p.slug,
      date: day.date,
      level: p.level,
      status: 'published',
      source: 'ai',
      title: p.title,
      statement: p.statement,
      constraints: p.constraints ?? [],
      signature: p.signature,
      compare: p.compare ?? 'exact',
      examples: p.examples.map((e) => encodeCase(e as Parameters<typeof encodeCase>[0])),
      tests: p.tests.map((e) => encodeCase(e as Parameters<typeof encodeCase>[0])),
      timeLimit: p.timeLimit ?? 5,
      referenceSolution: p.referenceSolution,
      ...(p.editorial ? { editorial: p.editorial } : {}),
      importHash: hash,
      tags: p.tags ?? [],
    };

    if (!existing) {
      await Problem.create(doc);
      report.imported.push(key);
      continue;
    }
    if (existing.source === 'ai' && existing.slug === p.slug) {
      if (existing.importHash === hash) continue; // ya importado, sin cambios
      if (!existing.importHash) {
        report.skipped.push(`${key}: editado a mano en el panel de admin, no se sobrescribe`);
        continue;
      }
      if (day.date <= t) {
        if (p.editorial) {
          await Problem.updateOne({ _id: existing._id }, { $set: { editorial: p.editorial, importHash: hash } });
          report.updated.push(`${key} (solo la explicación: el día ya ha empezado)`);
        } else {
          report.skipped.push(`${key}: el día ya ha empezado, no se modifica`);
        }
        continue;
      }
      await Problem.replaceOne({ _id: existing._id }, doc);
      report.updated.push(key);
      continue;
    }
    const played = await Progress.exists({ problemId: existing._id });
    if (existing.source === 'seed' && !played) {
      await Problem.deleteOne({ _id: existing._id });
      await Problem.create(doc);
      report.imported.push(`${key} (sustituye al de ejemplo ${existing.slug})`);
    } else {
      report.skipped.push(`${key}: ya hay otro reto publicado (${existing.slug}, ${existing.source})`);
    }
  }
}

export async function importDayData(day: unknown, label = 'subida'): Promise<ImportReport> {
  const report: ImportReport = { imported: [], updated: [], skipped: [], errors: [] };
  const d = day as DayFile;
  const err = validateDay(d, label);
  if (err) {
    report.errors.push(err);
    return report;
  }
  await importDay(d, label, report);
  return report;
}

export async function importRetos(dir = config.retosDir): Promise<ImportReport> {
  const report: ImportReport = { imported: [], updated: [], skipped: [], errors: [] };
  if (!existsSync(dir)) return report;
  const files = (await readdir(dir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  for (const f of files) {
    try {
      const day = JSON.parse(await readFile(path.join(dir, f), 'utf8')) as DayFile;
      const err = validateDay(day, f);
      if (err) {
        report.errors.push(err);
        continue;
      }
      await importDay(day, f, report);
    } catch (err) {
      report.errors.push(`${f}: ${(err as Error).message}`);
    }
  }
  return report;
}

const alreadyLogged = new Set<string>();
function once(msg: string, warn = false): void {
  if (alreadyLogged.has(msg)) return;
  alreadyLogged.add(msg);
  (warn ? console.warn : console.log)(msg);
}

function logReport(r: ImportReport): void {
  for (const k of r.imported) console.log(`[retos] importado ${k}`);
  for (const k of r.updated) console.log(`[retos] actualizado ${k}`);
  for (const k of r.skipped) once(`[retos] omitido ${k}`);
  for (const k of r.errors) once(`[retos] ERROR ${k}`, true);
}

/** Importa ahora y luego periódicamente. */
export function startRetosWatcher(intervalMs = 5 * 60_000): void {
  const run = () =>
    importRetos()
      .then(logReport)
      .catch((err) => console.warn('[retos] fallo al importar', err));
  void run();
  setInterval(run, intervalMs).unref();
}
