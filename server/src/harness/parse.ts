import type { ExecResult } from '../executor/types.js';
import { outputsMatch } from './compare.js';
import type { CompareMode, TestCase } from './types.js';

export type Verdict = 'pass' | 'fail' | 'error' | 'timeout' | 'skipped';

export interface TestOutcome {
  verdict: Verdict;
  /** Salida del usuario parseada (si devolvió algo) */
  actual?: unknown;
  /** Salida en bruto si no era JSON válido */
  rawActual?: string;
  error?: string;
  logs: string;
  timeMs?: number;
}

export interface ParsedRun {
  didNotStart: boolean;
  outcomes: TestOutcome[];
  /** Salida del programa fuera de los tests */
  globalLogs: string;
  errorOutput: string;
}

const MAX_LOG = 4000;

function clip(s: string): string {
  s = s.replace(/^\n+|\n+$/g, '');
  return s.length > MAX_LOG ? s.slice(0, MAX_LOG) + '\n…' : s;
}

export function parseRun(
  exec: ExecResult,
  tests: TestCase[],
  nonce: string,
  compare: CompareMode,
): ParsedRun {
  const errorOutput = [exec.compileOutput, exec.stderr, exec.message].filter(Boolean).join('\n').trim();

  if (exec.status === 'compile_error' || exec.status === 'internal_error') {
    return {
      didNotStart: true,
      outcomes: tests.map(() => ({ verdict: 'skipped' as const, logs: '' })),
      globalLogs: clip(exec.stdout),
      errorOutput,
    };
  }

  const marker = new RegExp(`^${nonce}:(\\d+):(BEGIN|OK|ERR|TLE|T)(?::(.*))?$`);
  const outcomes: (TestOutcome | undefined)[] = new Array(tests.length).fill(undefined);
  const logs: string[][] = tests.map(() => []);
  const times: (number | undefined)[] = new Array(tests.length).fill(undefined);
  const global: string[] = [];
  let current = -1;
  let started = false;
  let lastBegun = -1;

  for (const rawLine of exec.stdout.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    const m = marker.exec(line);
    if (!m) {
      if (current >= 0) logs[current].push(line);
      else global.push(line);
      continue;
    }
    const idx = Number(m[1]);
    if (idx < 0 || idx >= tests.length) continue;
    const kind = m[2];
    const payload = m[3] ?? '';
    if (kind === 'BEGIN') {
      started = true;
      current = idx;
      lastBegun = idx;
      continue;
    }
    if (kind === 'T') {
      const ms = Number(payload);
      if (Number.isFinite(ms) && ms >= 0) times[idx] = ms;
      continue;
    }
    current = -1;
    if (kind === 'TLE') {
      const t = outcomes[idx] ? idx + 1 : idx;
      if (t < tests.length) {
        outcomes[t] = { verdict: 'timeout', error: 'Time limit exceeded', logs: '' };
        started = true;
      }
      break;
    }
    if (kind === 'ERR') {
      outcomes[idx] = { verdict: 'error', error: payload, logs: '' };
      continue;
    }
    // OK
    let actual: unknown;
    try {
      actual = JSON.parse(payload);
    } catch {
      outcomes[idx] = { verdict: 'fail', rawActual: payload, logs: '' };
      continue;
    }
    const ok = outputsMatch(tests[idx].output, actual, compare);
    outcomes[idx] = { verdict: ok ? 'pass' : 'fail', actual, logs: '' };
  }

  if (!started) {
    return {
      didNotStart: true,
      outcomes: tests.map(() => ({ verdict: 'skipped' as const, logs: '' })),
      globalLogs: clip(global.join('\n')),
      errorOutput: errorOutput || (exec.status === 'timeout' ? 'Time limit exceeded' : ''),
    };
  }

  const final: TestOutcome[] = tests.map((_, i) => {
    const o = outcomes[i];
    if (o) return { ...o, logs: clip(logs[i].join('\n')), ...(times[i] != null ? { timeMs: times[i] } : {}) };
    if (i === lastBegun) {
      // Empezó pero no terminó: el proceso murió aquí.
      const verdict: Verdict = exec.status === 'timeout' ? 'timeout' : 'error';
      const error =
        exec.status === 'timeout'
          ? 'Time limit exceeded'
          : exec.status === 'memory_limit'
            ? 'Memory limit exceeded'
            : clip(errorOutput) || 'Runtime error';
      return { verdict, error, logs: clip(logs[i].join('\n')) };
    }
    return { verdict: 'skipped', logs: '' };
  });

  return { didNotStart: false, outcomes: final, globalLogs: clip(global.join('\n')), errorOutput };
}
