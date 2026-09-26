import { randomBytes } from 'node:crypto';
import { getExecutor } from '../executor/index.js';
import { buildProgram } from './drivers.js';
import { encodeTests } from './encode.js';
import { parseRun, type ParsedRun } from './parse.js';
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

export async function runTests(
  problem: RunnableProblem,
  language: Language,
  code: string,
  tests: TestCase[],
): Promise<RunResult> {
  const nonce = 'CDL' + randomBytes(8).toString('hex');
  const program = buildProgram(language, code, problem.signature, nonce);
  const cpu = problem.timeLimit ?? 5;
  const exec = await getExecutor().execute({
    language,
    source: program.source,
    stdin: encodeTests(problem.signature, tests),
    cpuTimeLimit: cpu,
    wallTimeLimit: Math.min(cpu * 2 + 2, 20),
    memoryLimit: (problem.memoryLimit ?? 256) * 1024,
  });
  const parsed = parseRun(exec, tests, nonce, problem.compare);
  return { ...parsed, execStatus: exec.status, timeMs: exec.timeMs, memoryKb: exec.memoryKb };
}
