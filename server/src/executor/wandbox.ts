import { config } from '../config.js';
import type { Language } from '../harness/types.js';
import { RUST_FLAGS, TS_FLAGS } from './local.js';
import { ExecutorQuotaError, type ExecRequest, type ExecResult, type Executor } from './types.js';

interface WandboxCompiler {
  name: string;
  language: string;
}

interface WandboxResponse {
  status?: string;
  signal?: string;
  compiler_output?: string;
  compiler_error?: string;
  compiler_message?: string;
  program_output?: string;
  program_error?: string;
}

const FALLBACK: Record<Language, string> = {
  python: 'cpython-3.12.7',
  javascript: 'nodejs-20.17.0',
  java: 'openjdk-jdk-22+36',
  cpp: 'gcc-13.2.0',
  go: 'go-1.23.2',
  rust: 'rust-1.82.0',
  csharp: 'mono-6.12.0.199',
  typescript: 'typescript-5.6.2',
};

// Versiones estables (nada de "-head" ni pypy).
const PATTERNS: Record<Language, { language: string; name: RegExp }> = {
  python: { language: 'Python', name: /^cpython-(3\.\d+\.\d+)$/ },
  javascript: { language: 'JavaScript', name: /^nodejs-(\d+\.\d+\.\d+)$/ },
  java: { language: 'Java', name: /^openjdk-jdk-(\d+)\+\d+$/ },
  cpp: { language: 'C++', name: /^gcc-(\d+\.\d+\.\d+)$/ },
  go: { language: 'Go', name: /^go-(\d+\.\d+\.\d+)$/ },
  rust: { language: 'Rust', name: /^rust-(\d+\.\d+\.\d+)$/ },
  csharp: { language: 'C#', name: /^mono-(\d+\.\d+\.\d+(?:\.\d+)?)$/ },
  typescript: { language: 'TypeScript', name: /^typescript-(\d+\.\d+\.\d+)$/ },
};

const OPTIONS: Record<Language, { compile?: string; runtime?: string }> = {
  python: {},
  javascript: {},
  java: { runtime: '-Xss64m' },
  cpp: { compile: '-O2\n-std=c++17' },
  go: {},
  rust: { compile: RUST_FLAGS.join('\n') },
  csharp: { compile: '-optimize+' },
  typescript: { compile: TS_FLAGS.join('\n') },
};

function version(v: string): number[] {
  return v.split('.').map(Number);
}

function newer(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

export function pickCompilers(list: WandboxCompiler[]): Record<Language, string> {
  const out = { ...FALLBACK };
  for (const lang of Object.keys(PATTERNS) as Language[]) {
    const { language, name } = PATTERNS[lang];
    let best: { name: string; v: number[] } | null = null;
    for (const c of list) {
      if (c.language !== language) continue;
      const m = name.exec(c.name);
      if (!m) continue;
      const v = version(m[1]);
      if (!best || newer(v, best.v) > 0) best = { name: c.name, v };
    }
    if (best) out[lang] = best.name;
  }
  return out;
}

/** Límite de salida de Wandbox (bytes). */
export const WANDBOX_OUTPUT_LIMIT = 128 * 1024;

export function mapWandboxResponse(r: WandboxResponse, timedOut = false): ExecResult {
  let stdout = r.program_output ?? '';
  const stderr = r.program_error ?? '';
  const compileOutput = [r.compiler_error, r.compiler_output].filter(Boolean).join('\n');
  const code = Number(r.status ?? '0');
  const ran = stdout !== '' || stderr !== '';

  if (timedOut) return { status: 'timeout', stdout, stderr, compileOutput, message: 'Time limit exceeded' };
  if (r.status === '' && Buffer.byteLength(stdout, 'utf8') >= WANDBOX_OUTPUT_LIMIT - 1024) {
    stdout = stdout.slice(0, stdout.lastIndexOf('\n') + 1);
    return {
      status: 'runtime_error',
      stdout,
      stderr,
      compileOutput: '',
      message: 'Output limit exceeded (128 KB): quita los print o devuelve menos datos',
    };
  }
  if (code !== 0 && !ran && compileOutput.trim() !== '') {
    return { status: 'compile_error', stdout, stderr, compileOutput };
  }
  if (code === 0 && !r.signal) return { status: 'ok', stdout, stderr, compileOutput: '' };
  if (code === 137 || /kill/i.test(r.signal ?? '')) {
    return { status: 'timeout', stdout, stderr, compileOutput: '', message: 'Time limit exceeded' };
  }
  return {
    status: 'runtime_error',
    stdout,
    stderr,
    compileOutput: '',
    message: r.signal ? `Signal: ${r.signal}` : code > 128 ? `Killed by signal ${code - 128}` : `Exited with code ${code}`,
  };
}

/** Cuerpo de la petición a /api/compile.json. */
export function wandboxBody(req: Pick<ExecRequest, 'language' | 'source' | 'stdin'>, compiler: string): Record<string, unknown> {
  const opts = OPTIONS[req.language];
  const code = req.language === 'java' ? req.source.replace(/^public class Main\b/m, 'class Main') : req.source;
  const body: Record<string, unknown> = { compiler, code, stdin: req.stdin, save: false };
  if (opts.compile) body['compiler-option-raw'] = opts.compile;
  if (opts.runtime) body['runtime-option-raw'] = opts.runtime;
  return body;
}

function internalError(message: string): ExecResult {
  return { status: 'internal_error', stdout: '', stderr: '', compileOutput: '', message };
}

export class WandboxExecutor implements Executor {
  name = 'wandbox';
  maxRequestBytes = 1_000_000;
  maxOutputBytes = 110_000;
  maxParallel = 2;
  private compilers: Promise<Record<Language, string>> | null = null;

  watchdogMs(cpuSeconds: number): number {
    return cpuSeconds * 1000 * config.wandbox.timeFactor;
  }

  private pick(): Promise<Record<Language, string>> {
    if (!this.compilers) {
      this.compilers = (async () => {
        let result = { ...FALLBACK };
        try {
          const res = await fetch(`${config.wandbox.url}/api/list.json`, { signal: AbortSignal.timeout(15_000) });
          if (res.ok) result = pickCompilers((await res.json()) as WandboxCompiler[]);
        } catch (err) {
          console.warn('[wandbox] no se pudo leer la lista de compiladores, uso los de por defecto', err);
        }
        for (const lang of Object.keys(result) as Language[]) {
          const override = config.wandbox.compilers[lang];
          if (override) result[lang] = override;
        }
        console.log('[wandbox] compiladores', result);
        return result;
      })();
    }
    return this.compilers;
  }

  async execute(req: ExecRequest): Promise<ExecResult> {
    const compilers = await this.pick();
    const body = wandboxBody(req, compilers[req.language]);

    const abortMs = (req.wallTimeLimit + config.wandbox.extraSeconds) * 1000;
    let res: Response;
    try {
      res = await fetch(`${config.wandbox.url}/api/compile.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(abortMs),
      });
    } catch (err) {
      if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        return mapWandboxResponse({}, true);
      }
      return internalError(`No se pudo contactar con Wandbox: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (res.status === 429 || res.status === 503) throw new ExecutorQuotaError('Wandbox está saturado ahora mismo');
    if (res.status === 413) return internalError('La entrada de los tests es demasiado grande para Wandbox');
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return internalError(`Wandbox respondió ${res.status}: ${text.slice(0, 300)}`);
    }
    let data: WandboxResponse;
    try {
      data = (await res.json()) as WandboxResponse;
    } catch {
      return internalError('Wandbox devolvió una respuesta que no es JSON');
    }
    return mapWandboxResponse(data);
  }
}
