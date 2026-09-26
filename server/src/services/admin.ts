import mongoose from 'mongoose';
import { z } from 'zod';
import { runTests } from '../harness/runner.js';
import {
  LANGUAGES,
  validateSignature,
  validateTestCase,
  validateValue,
  VALUE_TYPES,
  type Language,
  type TestCase,
} from '../harness/types.js';
import { decodeCase, encodeCase, HEAVY_FIELDS, Problem, type StoredTestCase } from '../models/Problem.js';
import { Progress } from '../models/Progress.js';
import { User } from '../models/User.js';
import { addDays, isValidDate, today } from './dates.js';
import { HttpError } from './game.js';

const i18n = z.object({ es: z.string().max(20_000), en: z.string().max(20_000) });
const testCase = z.object({
  input: z.array(z.unknown()),
  output: z.unknown().optional(),
  explanation: i18n.optional(),
});

export const problemBody = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug: minúsculas, números y guiones')
    .max(80),
  date: z.string().refine(isValidDate, 'fecha inválida (AAAA-MM-DD)'),
  level: z.number().int().min(1).max(4),
  status: z.enum(['draft', 'pending', 'published', 'rejected']),
  title: i18n,
  statement: i18n,
  constraints: z.array(z.string().max(300)).max(20).default([]),
  tags: z.array(z.string().max(40)).max(10).default([]),
  signature: z.object({
    functionName: z.string(),
    params: z.array(z.object({ name: z.string(), type: z.enum(VALUE_TYPES) })).max(8),
    returnType: z.enum(VALUE_TYPES),
  }),
  compare: z.enum(['exact', 'unordered', 'unordered-deep']).default('exact'),
  timeLimit: z.number().min(1).max(15).default(5),
  examples: z.array(testCase).min(1).max(6),
  tests: z.array(testCase).max(60),
  referenceSolution: z
    .object({ language: z.enum(LANGUAGES), code: z.string().max(64 * 1024) })
    .nullable()
    .optional(),
});
export type ProblemBody = z.infer<typeof problemBody>;

export function parseProblemBody(body: unknown): ProblemBody {
  const r = problemBody.safeParse(body);
  if (!r.success) {
    const i = r.error.issues[0];
    throw new HttpError(400, 'invalid_problem', `${i.path.join('.')}: ${i.message}`);
  }
  return r.data;
}

function validateCases(p: ProblemBody, requireOutputs: boolean): void {
  const sigErr = validateSignature(p.signature);
  if (sigErr) throw new HttpError(400, 'invalid_problem', sigErr);
  const all = [...p.examples.map((c, i) => ['ejemplo', i, c] as const), ...p.tests.map((c, i) => ['test', i, c] as const)];
  for (const [kind, i, c] of all) {
    const label = `${kind} ${i + 1}`;
    if (!requireOutputs) {
      if (c.input.length !== p.signature.params.length)
        throw new HttpError(400, 'invalid_problem', `${label}: input debe tener ${p.signature.params.length} valores`);
      p.signature.params.forEach((prm, j) => {
        const err = validateValue(c.input[j], prm.type, `${label}.${prm.name}`);
        if (err) throw new HttpError(400, 'invalid_problem', err);
      });
      continue;
    }
    if (c.output === undefined) throw new HttpError(400, 'invalid_problem', `${label}: falta output (recalcula las salidas)`);
    const err = validateTestCase(p.signature, c as TestCase, label);
    if (err) throw new HttpError(400, 'invalid_problem', err);
  }
}

export async function listProblems(q: { status?: string; from?: string; to?: string; search?: string }) {
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.from || q.to) {
    filter.date = {
      ...(q.from && isValidDate(q.from) ? { $gte: q.from } : {}),
      ...(q.to && isValidDate(q.to) ? { $lte: q.to } : {}),
    };
  }
  if (q.search) {
    const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ slug: rx }, { 'title.es': rx }, { 'title.en': rx }, { tags: rx }];
  }
  const problems = await Problem.find(filter)
    .select(HEAVY_FIELDS + ' -statement')
    .sort({ date: -1, level: 1 })
    .limit(500)
    .lean();
  const ids = problems.map((p) => p._id);
  const progress = await Progress.find({ problemId: { $in: ids } })
    .select('problemId solved attempts.passed')
    .lean();
  const stats: { _id: string; players: number; solved: number; submissions: number }[] = [];
  const acc = new Map<string, { _id: string; players: number; solved: number; submissions: number }>();
  for (const pr of progress) {
    const k = String(pr.problemId);
    const a = acc.get(k) ?? { _id: k, players: 0, solved: 0, submissions: 0 };
    const n = pr.attempts?.length ?? 0;
    if (n > 0) a.players++;
    if (pr.solved) a.solved++;
    a.submissions += n;
    acc.set(k, a);
  }
  stats.push(...acc.values());
  const byId = new Map(stats.map((s) => [String(s._id), s]));
  return problems.map((p) => {
    const s = byId.get(String(p._id));
    return {
      id: String(p._id),
      slug: p.slug,
      date: p.date,
      level: p.level,
      status: p.status,
      source: p.source,
      title: p.title,
      tags: p.tags ?? [],
      players: s?.players ?? 0,
      solved: s?.solved ?? 0,
      submissions: s?.submissions ?? 0,
    };
  });
}

type StoredProblem = Omit<ProblemBody, 'examples' | 'tests'> & {
  _id: mongoose.Types.ObjectId;
  source: string;
  examples: StoredTestCase[];
  tests: StoredTestCase[];
};

export async function getProblemFull(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'not_found');
  const p = await Problem.findById(id).lean<StoredProblem>();
  if (!p) throw new HttpError(404, 'not_found');
  const progress = await Progress.countDocuments({ problemId: p._id, 'attempts.0': { $exists: true } });
  return {
    id: String(p._id),
    slug: p.slug,
    date: p.date,
    level: p.level,
    status: p.status,
    source: p.source,
    title: p.title,
    statement: p.statement,
    constraints: p.constraints ?? [],
    tags: p.tags ?? [],
    signature: p.signature,
    compare: p.compare,
    timeLimit: p.timeLimit ?? 5,
    examples: p.examples.map(decodeCase),
    tests: p.tests.map(decodeCase),
    referenceSolution: p.referenceSolution?.code ? p.referenceSolution : null,
    players: progress,
  };
}

async function assertSlotFree(p: ProblemBody, selfId?: string): Promise<void> {
  const notSelf = selfId ? { _id: { $ne: new mongoose.Types.ObjectId(selfId) } } : {};
  if (p.status === 'published') {
    const clash = await Problem.findOne({ date: p.date, level: p.level, status: 'published', ...notSelf })
      .select('slug')
      .lean();
    if (clash) throw new HttpError(409, 'slot_taken', `Ya hay un reto publicado el ${p.date} en el nivel ${p.level}: ${clash.slug}`);
  }
  const sameSlug = await Problem.findOne({ slug: p.slug, ...notSelf }).select('date').lean();
  if (sameSlug) throw new HttpError(409, 'slug_taken', `El slug ${p.slug} ya lo usa el reto del ${sameSlug.date}`);
}

function toDoc(p: ProblemBody) {
  return {
    ...p,
    examples: p.examples.map((c) => encodeCase(c as Parameters<typeof encodeCase>[0])),
    tests: p.tests.map((c) => encodeCase(c as Parameters<typeof encodeCase>[0])),
    referenceSolution: p.referenceSolution ?? undefined,
  };
}

export async function createProblem(body: unknown) {
  const p = parseProblemBody(body);
  validateCases(p, true);
  await assertSlotFree(p);
  const doc = await Problem.create({ ...toDoc(p), source: 'admin' });
  return getProblemFull(String(doc._id));
}

export async function updateProblem(id: string, body: unknown) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'not_found');
  const existing = await Problem.findById(id).select('source importHash').lean();
  if (!existing) throw new HttpError(404, 'not_found');
  const p = parseProblemBody(body);
  validateCases(p, true);
  await assertSlotFree(p, id);
  await Problem.updateOne({ _id: id }, { $set: toDoc(p), $unset: { importHash: 1 } });
  return getProblemFull(id);
}

export async function setStatus(id: string, status: ProblemBody['status']) {
  const full = await getProblemFull(id);
  const p = parseProblemBody({ ...full, status });
  await assertSlotFree(p, id);
  await Problem.updateOne({ _id: id }, { $set: { status } });
  return getProblemFull(id);
}

export async function deleteProblem(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'not_found');
  if (await Progress.exists({ problemId: id }))
    throw new HttpError(409, 'has_progress', 'Hay jugadores con progreso en este reto: retíralo (rechazado) en vez de borrarlo');
  const r = await Problem.deleteOne({ _id: id });
  if (!r.deletedCount) throw new HttpError(404, 'not_found');
  return { ok: true };
}

export async function computeOutputs(body: unknown) {
  const p = parseProblemBody(body);
  validateCases(p, false);
  const ref = p.referenceSolution;
  if (!ref?.code.trim()) throw new HttpError(400, 'no_reference', 'Falta la solución de referencia');
  const cases = [...p.examples, ...p.tests].map((c) => ({ input: c.input, output: null }));
  const r = await runTests({ signature: p.signature, compare: p.compare, timeLimit: Math.max(p.timeLimit, 10) }, ref.language, ref.code, cases);
  if (r.execStatus === 'internal_error') throw new HttpError(502, 'executor_error', r.errorOutput);
  if (r.didNotStart) throw new HttpError(400, 'reference_failed', r.errorOutput || 'La referencia no compila');
  const outputs: unknown[] = [];
  r.outcomes.forEach((o, i) => {
    const label = i < p.examples.length ? `ejemplo ${i + 1}` : `test ${i - p.examples.length + 1}`;
    if (o.actual === undefined || o.verdict === 'error' || o.verdict === 'timeout' || o.verdict === 'skipped')
      throw new HttpError(400, 'reference_failed', `${label}: ${o.error ?? o.verdict}`);
    const err = validateValue(o.actual, p.signature.returnType, `${label}.output`);
    if (err) throw new HttpError(400, 'reference_failed', `La referencia devuelve un tipo incorrecto: ${err}`);
    outputs.push(o.actual);
  });
  return {
    examples: p.examples.map((c, i) => ({ ...c, output: outputs[i] })),
    tests: p.tests.map((c, i) => ({ ...c, output: outputs[p.examples.length + i] })),
    timeMs: r.timeMs,
  };
}

export async function tryCode(body: unknown, language: Language, code: string) {
  const p = parseProblemBody(body);
  validateCases(p, true);
  const cases = [...p.examples, ...p.tests] as TestCase[];
  const r = await runTests({ signature: p.signature, compare: p.compare, timeLimit: p.timeLimit }, language, code, cases);
  if (r.execStatus === 'internal_error') throw new HttpError(502, 'executor_error', r.errorOutput);
  return {
    status: r.didNotStart ? 'compile_error' : 'ok',
    errorOutput: r.errorOutput,
    timeMs: r.timeMs,
    results: r.outcomes.map((o, i) => ({
      index: i,
      kind: i < p.examples.length ? 'example' : 'test',
      verdict: o.verdict,
      error: o.error,
      actual: o.actual,
      expected: cases[i].output,
    })),
  };
}

export async function overview() {
  const t = today();
  const since = new Date(Date.now() - 24 * 3600_000);
  const [users, players, submissions24h, byStatus, upcoming] = await Promise.all([
    User.countDocuments(),
    Progress.distinct('playerId').then((x) => x.length),
    Progress.aggregate<{ n: number }>([
      { $unwind: '$attempts' },
      { $match: { 'attempts.at': { $gte: since } } },
      { $count: 'n' },
    ]).then((x) => x[0]?.n ?? 0),
    Problem.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Problem.aggregate<{ _id: string; n: number }>([
      { $match: { status: 'published', date: { $gte: t, $lte: addDays(t, 7) } } },
      { $group: { _id: '$date', n: { $sum: 1 } } },
    ]),
  ]);
  const upcomingMap = new Map(upcoming.map((u) => [u._id, u.n]));
  return {
    today: t,
    users,
    players,
    submissions24h,
    problemsByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.n])),
    nextDays: Array.from({ length: 8 }, (_, i) => {
      const d = addDays(t, i);
      return { date: d, published: upcomingMap.get(d) ?? 0 };
    }),
  };
}
