import { randomBytes } from 'node:crypto';
import { getExecutor } from '../executor/index.js';
import type { ExecResult, Executor } from '../executor/types.js';
import { buildProgram } from './drivers.js';
import { encodeTests } from './encode.js';
import { parseRun, type ParsedRun, type TestOutcome } from './parse.js';
import type { CompareMode, Language, Signature, TestCase } from './types.js';

export interface RunnableProblem {
  signature: Signature;
  compare: CompareMode;
  /** segundos de CPU para el lote completo de tests */
  timeLimit?: number;
  /** MB */
  memoryLimit?: number;
}

export interface RunResult extends ParsedRun {
  execStatus: string;
  timeMs?: number;
  memoryKb?: number;
}

export const MAX_CODE_LENGTH = 64 * 1024;

const REQUEST_OVERHEAD = 4 * 1024;

function jsonBytes(s: string): number {
  return Buffer.byteLength(JSON.stringify(s), 'utf8');
}

function outputBytes(t: TestCase): number {
  return Buffer.byteLength(JSON.stringify(t.output ?? null) ?? 'null', 'utf8') + 64;
}

export function splitTests(
  sig: Signature,
  tests: TestCase[],
  sourceBytes: number,
  maxBytes?: number,
  maxOutput?: number,
): TestCase[][] {
  if ((!maxBytes && !maxOutput) || tests.length <= 1) return [tests];
  const budget = maxBytes ? maxBytes - sourceBytes - REQUEST_OVERHEAD : Infinity;
  const outBudget = maxOutput ?? Infinity;
  const totalOut = tests.reduce((a, t) => a + outputBytes(t), 0);
  if (jsonBytes(encodeTests(sig, tests)) <= budget && totalOut <= outBudget) return [tests];
  const groups: TestCase[][] = [];
  let cur: TestCase[] = [];
  let curBytes = 8; // "T\n" y comillas
  let curOut = 0;
  for (const t of tests) {
    const b = jsonBytes(encodeTests(sig, [t])) - 4;
    const o = outputBytes(t);
    if (cur.length && (curBytes + b > budget || curOut + o > outBudget)) {
      groups.push(cur);
      cur = [];
      curBytes = 8;
      curOut = 0;
    }
    cur.push(t);
    curBytes += b;
    curOut += o;
  }
  if (cur.length) groups.push(cur);
  return groups;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function runTests(
  problem: RunnableProblem,
  language: Language,
  code: string,
  tests: TestCase[],
  executor: Executor = getExecutor(),
): Promise<RunResult> {
  const nonce = 'CDL' + randomBytes(8).toString('hex');
  const cpu = problem.timeLimit ?? 5;
  const program = buildProgram(language, code, problem.signature, nonce, {
    watchdogMs: executor.watchdogMs?.(cpu),
  });
  const groups = splitTests(
    problem.signature,
    tests,
    jsonBytes(program.source),
    executor.maxRequestBytes,
    executor.maxOutputBytes,
  );

  const runGroup = async (group: TestCase[]) => {
    const exec: ExecResult = await executor.execute({
      language,
      source: program.source,
      stdin: encodeTests(problem.signature, group),
      cpuTimeLimit: cpu,
      wallTimeLimit: Math.min(cpu * 2 + 2, 20),
      memoryLimit: (problem.memoryLimit ?? 256) * 1024,
    });
    return { exec, parsed: parseRun(exec, group, nonce, problem.compare) };
  };

  if (groups.length === 1) {
    const { exec, parsed } = await runGroup(tests);
    return { ...parsed, execStatus: exec.status, timeMs: exec.timeMs, memoryKb: exec.memoryKb };
  }

  const results = await mapLimit(groups, executor.maxParallel ?? 1, runGroup);
  const first = results[0];
  if (first.parsed.didNotStart) {
    return {
      ...first.parsed,
      outcomes: tests.map(() => ({ verdict: 'skipped' as const, logs: '' })),
      execStatus: first.exec.status,
    };
  }
  const outcomes: TestOutcome[] = [];
  const globalLogs: string[] = [];
  const errors: string[] = [];
  let execStatus = 'ok';
  let timeMs = 0;
  for (const { exec, parsed } of results) {
    if (parsed.didNotStart) {
      const error = parsed.errorOutput || 'Error del motor de ejecución';
      outcomes.push(...parsed.outcomes.map(() => ({ verdict: 'error' as const, error, logs: '' })));
    } else {
      outcomes.push(...parsed.outcomes);
    }
    if (parsed.globalLogs) globalLogs.push(parsed.globalLogs);
    if (parsed.errorOutput) errors.push(parsed.errorOutput);
    if (exec.status === 'internal_error') execStatus = 'internal_error';
    else if (exec.status !== 'ok' && execStatus === 'ok') execStatus = exec.status;
    timeMs += exec.timeMs ?? 0;
  }
  return {
    didNotStart: false,
    outcomes,
    globalLogs: globalLogs.join('\n'),
    errorOutput: errors.join('\n'),
    execStatus,
    timeMs: timeMs || undefined,
  };
}
