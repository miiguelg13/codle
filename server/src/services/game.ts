import mongoose from 'mongoose';
import { config } from '../config.js';
import { runTests } from '../harness/runner.js';
import { allStarterCode } from '../harness/templates.js';
import type { CompareMode, Language, Signature, TestCase } from '../harness/types.js';
import { decodeCase, HEAVY_FIELDS, Problem, type StoredTestCase } from '../models/Problem.js';
import { Progress } from '../models/Progress.js';
import { today } from './dates.js';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

type LeanProblem = {
  _id: mongoose.Types.ObjectId;
  slug: string;
  date: string;
  level: number;
  title: { es: string; en: string };
  statement: { es: string; en: string };
  constraints: string[];
  signature: Signature;
  compare: CompareMode;
  examples: (TestCase & { explanation?: { es: string; en: string } })[];
  tests: TestCase[];
  timeLimit: number;
  memoryLimit: number;
  referenceSolution?: { language?: string; code?: string };
};

type LeanProgress = {
  attempts: { at: Date; language: string; verdicts: string[]; passed: number; total: number; timeMs?: number }[];
  solved: boolean;
  solvedOnDay?: boolean;
  lastCode?: Record<string, string> | Map<string, string>;
};

export function publicProgress(p: LeanProgress | null | undefined) {
  const attempts = (p?.attempts ?? []).map((a) => ({
    at: a.at,
    language: a.language,
    verdicts: a.verdicts,
    passed: a.passed,
    total: a.total,
    timeMs: a.timeMs,
  }));
  const solved = !!p?.solved;
  return {
    attempts,
    solved,
    solvedOnDay: !!p?.solvedOnDay,
    finished: solved || attempts.length >= config.maxAttempts,
    maxAttempts: config.maxAttempts,
  };
}

function assertValidId(id: string): void {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'not_found');
}

async function loadVisibleProblem(id: string): Promise<LeanProblem> {
  assertValidId(id);
  const p = await Problem.findOne({ _id: id, status: 'published', date: { $lte: today() } }).lean<
    Omit<LeanProblem, 'examples' | 'tests'> & { examples: StoredTestCase[]; tests: StoredTestCase[] }
  >();
  if (!p) throw new HttpError(404, 'not_found');
  return { ...p, examples: p.examples.map(decodeCase), tests: p.tests.map(decodeCase) };
}

export async function getDay(date: string, playerId: string) {
  const t = today();
  if (date > t) throw new HttpError(403, 'future_day');
  const problems = await Problem.find({ date, status: 'published' })
    .select(HEAVY_FIELDS + ' -statement')
    .sort({ level: 1 })
    .lean<LeanProblem[]>();
  const progress = await Progress.find({ playerId, problemId: { $in: problems.map((p) => p._id) } }).lean();
  const byProblem = new Map(progress.map((p) => [String(p.problemId), p as unknown as LeanProgress]));
  return {
    date,
    today: t,
    isToday: date === t,
    problems: problems.map((p) => ({
      id: String(p._id),
      slug: p.slug,
      level: p.level,
      title: p.title,
      progress: publicProgress(byProblem.get(String(p._id))),
    })),
  };
}

export async function getCalendar(playerId: string) {
  const t = today();
  const days = await Problem.aggregate<{ _id: string; total: number }>([
    { $match: { status: 'published', date: { $lte: t } } },
    { $group: { _id: '$date', total: { $sum: 1 } } },
    { $sort: { _id: -1 } },
  ]);
  const progress = await Progress.find({ playerId }).select('date solved attempts').lean();
  const stats = new Map<string, { solved: number; attempted: number; failed: number }>();
  for (const p of progress) {
    const s = stats.get(p.date) ?? { solved: 0, attempted: 0, failed: 0 };
    if (p.attempts.length) s.attempted++;
    if (p.solved) s.solved++;
    else if (p.attempts.length >= config.maxAttempts) s.failed++;
    stats.set(p.date, s);
  }
  return {
    today: t,
    days: days.map((d) => ({ date: d._id, total: d.total, ...(stats.get(d._id) ?? { solved: 0, attempted: 0, failed: 0 }) })),
  };
}

export async function getProblem(id: string, playerId: string) {
  const p = await loadVisibleProblem(id);
  const progress = await Progress.findOne({ playerId, problemId: p._id }).lean<LeanProgress>();
  const pub = publicProgress(progress);
  const lastCode = progress?.lastCode
    ? Object.fromEntries(progress.lastCode instanceof Map ? progress.lastCode : Object.entries(progress.lastCode))
    : {};
  return {
    id: String(p._id),
    slug: p.slug,
    date: p.date,
    level: p.level,
    title: p.title,
    statement: p.statement,
    constraints: p.constraints,
    signature: p.signature,
    compare: p.compare,
    examples: p.examples.map((e) => ({ input: e.input, output: e.output, explanation: e.explanation })),
    totalTests: p.examples.length + p.tests.length,
    starterCode: allStarterCode(p.signature),
    lastCode,
    progress: pub,
    referenceSolution: pub.finished ? (p.referenceSolution ?? null) : null,
  };
}

export async function runExamples(id: string, language: Language, code: string) {
  const p = await loadVisibleProblem(id);
  const r = await runTests(p, language, code, p.examples);
  if (r.execStatus === 'internal_error') throw new HttpError(502, 'executor_error', r.errorOutput);
  return {
    status: r.didNotStart ? 'compile_error' : 'ok',
    errorOutput: r.errorOutput,
    globalLogs: r.globalLogs,
    timeMs: r.timeMs,
    cases: p.examples.map((e, i) => {
      const o = r.outcomes[i];
      return {
        input: e.input,
        expected: e.output,
        actual: o.actual,
        rawActual: o.rawActual,
        verdict: o.verdict,
        error: o.error,
        logs: o.logs,
      };
    }),
  };
}

const LOCK_MS = 60_000;

export async function submit(id: string, playerId: string, language: Language, code: string) {
  const p = await loadVisibleProblem(id);
  const now = new Date();

  try {
    await Progress.updateOne(
      { playerId, problemId: p._id },
      { $setOnInsert: { playerId, problemId: p._id, date: p.date, level: p.level, attempts: [], solved: false } },
      { upsert: true },
    );
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
  }

  const locked = await Progress.findOneAndUpdate(
    {
      playerId,
      problemId: p._id,
      solved: false,
      [`attempts.${config.maxAttempts - 1}`]: { $exists: false },
      $or: [{ pendingUntil: null }, { pendingUntil: { $lt: now } }],
    },
    { $set: { pendingUntil: new Date(now.getTime() + LOCK_MS) } },
    { new: true },
  ).lean();

  if (!locked) {
    const cur = await Progress.findOne({ playerId, problemId: p._id }).lean();
    if (cur?.solved) throw new HttpError(409, 'already_solved');
    if ((cur?.attempts?.length ?? 0) >= config.maxAttempts) throw new HttpError(409, 'no_attempts_left');
    throw new HttpError(429, 'submission_in_progress');
  }

  const release = () => Progress.updateOne({ _id: locked._id }, { $unset: { pendingUntil: 1 } });

  let result;
  try {
    const all = [...p.examples, ...p.tests];
    result = await runTests(p, language, code, all);
  } catch (err) {
    await release();
    throw err;
  }

  if (result.execStatus === 'internal_error') {
    await release();
    throw new HttpError(502, 'executor_error', result.errorOutput);
  }

  if (result.didNotStart) {
    await release();
    return {
      status: 'compile_error' as const,
      errorOutput: result.errorOutput.slice(0, 2000),
      progress: publicProgress(locked as unknown as LeanProgress),
    };
  }

  const verdicts = result.outcomes.map((o) => o.verdict);
  const passed = verdicts.filter((v) => v === 'pass').length;
  const solved = passed === verdicts.length;
  const attempt = { at: now, language, verdicts, passed, total: verdicts.length, timeMs: result.timeMs };

  const updated = await Progress.findOneAndUpdate(
    { _id: locked._id },
    {
      $push: { attempts: attempt },
      $unset: { pendingUntil: 1 },
      $set: {
        [`lastCode.${language}`]: code,
        ...(solved ? { solved: true, solvedAt: now, solvedOnDay: p.date === today() } : {}),
      },
    },
    { new: true },
  ).lean<LeanProgress>();

  const firstBad = result.outcomes.findIndex((o) => o.verdict !== 'pass');
  let firstFailure = null;
  if (firstBad >= 0) {
    const o = result.outcomes[firstBad];
    const isExample = firstBad < p.examples.length;
    firstFailure = {
      index: firstBad,
      verdict: o.verdict,
      error: o.error ? (isExample ? o.error : o.error.split(':')[0]) : undefined,
      example: isExample
        ? { input: p.examples[firstBad].input, expected: p.examples[firstBad].output, actual: o.actual }
        : undefined,
    };
  }

  return {
    status: 'ok' as const,
    attempt,
    solved,
    firstFailure,
    progress: publicProgress(updated),
    referenceSolution: publicProgress(updated).finished ? (p.referenceSolution ?? null) : null,
  };
}
