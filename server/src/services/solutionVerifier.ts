import { runTests } from '../harness/runner.js';
import type { StoredSolution } from '../harness/solutions.js';
import type { CompareMode, Signature } from '../harness/types.js';
import { decodeCase, Problem, type StoredTestCase } from '../models/Problem.js';
import { addDays, today } from './dates.js';

const PAUSE_MS = 3_000;
const IDLE_MS = 10 * 60_000;
const RETRY_MS = 5 * 60_000;

type Pending = {
  _id: unknown;
  slug: string;
  date: string;
  signature: Signature;
  compare: CompareMode;
  timeLimit?: number;
  examples: StoredTestCase[];
  tests: StoredTestCase[];
  solutions: StoredSolution[];
};

let timer: NodeJS.Timeout | null = null;
let running = false;

export async function verifyNext(): Promise<'done' | 'idle' | 'retry'> {
  const t = today();
  const query = { status: 'published', 'solutions.status': 'pending' };
  const p =
    (await Problem.findOne({ ...query, date: { $gte: t, $lte: addDays(t, 7) } }).sort({ date: 1, level: 1 }).lean<Pending>()) ??
    (await Problem.findOne(query).sort({ date: -1, level: 1 }).lean<Pending>());
  if (!p) return 'idle';
  const sol = p.solutions.find((s) => s.status === 'pending')!;
  const cases = [...p.examples, ...p.tests].map(decodeCase);
  let result;
  try {
    result = await runTests({ signature: p.signature, compare: p.compare, timeLimit: p.timeLimit ?? 5 }, sol.language, sol.code, cases);
  } catch (err) {
    console.warn(`[soluciones] ${p.slug} [${sol.language}]: el motor no responde, lo reintento luego`, err instanceof Error ? err.message : err);
    return 'retry';
  }
  if (result.execStatus === 'internal_error') {
    console.warn(`[soluciones] ${p.slug} [${sol.language}]: error del motor, lo reintento luego: ${result.errorOutput.slice(0, 200)}`);
    return 'retry';
  }
  const bad = result.outcomes.findIndex((o) => o.verdict !== 'pass');
  const ok = !result.didNotStart && bad < 0;
  const error = ok
    ? undefined
    : result.didNotStart
      ? `No compila: ${result.errorOutput.slice(0, 1500)}`
      : `Test ${bad + 1}/${cases.length}: ${result.outcomes[bad].verdict}${result.outcomes[bad].error ? ` (${result.outcomes[bad].error!.slice(0, 500)})` : ''}`;
  const i = p.solutions.indexOf(sol);
  const at = `solutions.${i}`;
  await Problem.updateOne(
    { _id: p._id, [`${at}.language`]: sol.language, [`${at}.code`]: sol.code },
    {
      $set: { [`${at}.status`]: ok ? 'ok' : 'failed', [`${at}.checkedAt`]: new Date(), ...(error ? { [`${at}.error`]: error } : {}) },
      ...(error ? {} : { $unset: { [`${at}.error`]: 1 } }),
    },
  );
  console.log(`[soluciones] ${p.date} ${p.slug} [${sol.language}]: ${ok ? `OK (${result.timeMs ?? '?'} ms)` : `FALLA: ${error}`}`);
  return 'done';
}

function schedule(ms: number): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(loop, ms);
  timer.unref?.();
}

async function loop(): Promise<void> {
  if (running) return;
  running = true;
  let next = IDLE_MS;
  try {
    const r = await verifyNext();
    next = r === 'done' ? PAUSE_MS : r === 'retry' ? RETRY_MS : IDLE_MS;
  } catch (err) {
    console.warn('[soluciones] error al verificar', err);
    next = RETRY_MS;
  } finally {
    running = false;
  }
  schedule(next);
}

/** Arranca la verificación periódica. */
export function startSolutionVerifier(delayMs = 30_000): void {
  schedule(delayMs);
}

export function kickSolutionVerifier(): void {
  if (timer && !running) schedule(1_000);
}
