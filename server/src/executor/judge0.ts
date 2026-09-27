import { config } from '../config.js';
import type { Language } from '../harness/types.js';
import { ExecutorQuotaError, type ExecRequest, type ExecResult, type ExecStatus, type Executor } from './types.js';

interface Judge0Language {
  id: number;
  name: string;
}

interface Judge0Submission {
  token?: string;
  status?: { id: number; description: string };
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | null;
  memory?: number | null;
}

const FALLBACK_IDS: Record<Language, number> = {
  python: 71,
  javascript: 63,
  java: 62,
  cpp: 54,
  go: 60,
  rust: 73,
  csharp: 51,
  typescript: 74,
};

const LANGUAGE_PATTERNS: Record<Language, RegExp> = {
  python: /^Python \(3\.[\d.]+\)$/,
  javascript: /^JavaScript \(Node\.js [\d.]+\)$/,
  java: /^Java \((OpenJDK|JDK) [\d.]+\)$/,
  cpp: /^C\+\+ \(GCC [\d.]+\)$/,
  go: /^Go \([\d.]+\)$/,
  rust: /^Rust \([\d.]+\)$/,
  csharp: /^C# \(Mono [\d.]+\)$/,
  typescript: /^TypeScript \([\d.]+\)$/,
};

function versionOf(name: string): number[] {
  const m = /([\d.]+)\)$/.exec(name);
  return m ? m[1].split('.').map(Number) : [0];
}

function cmpVersion(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const unb64 = (s: string | null | undefined) => (s ? Buffer.from(s, 'base64').toString('utf8') : '');

export class Judge0Executor implements Executor {
  name = 'judge0';
  private ids: Promise<Record<Language, number>> | null = null;

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const { rapidApiKey, authToken, url } = config.judge0;
    if (rapidApiKey) {
      h['X-RapidAPI-Key'] = rapidApiKey;
      h['X-RapidAPI-Host'] = new URL(url).host;
    }
    if (authToken) h['X-Auth-Token'] = authToken;
    return h;
  }

  private languageIds(): Promise<Record<Language, number>> {
    if (!this.ids) {
      this.ids = (async () => {
        const result = { ...FALLBACK_IDS };
        try {
          const res = await fetch(`${config.judge0.url}/languages`, { headers: this.headers() });
          if (res.ok) {
            const langs = (await res.json()) as Judge0Language[];
            for (const lang of Object.keys(LANGUAGE_PATTERNS) as Language[]) {
              const matches = langs.filter((l) => LANGUAGE_PATTERNS[lang].test(l.name));
              matches.sort((a, b) => cmpVersion(versionOf(b.name), versionOf(a.name)));
              if (matches[0]) result[lang] = matches[0].id;
            }
          }
        } catch (err) {
          console.warn('[judge0] no se pudo obtener /languages, uso IDs por defecto', err);
        }
        for (const lang of Object.keys(result) as Language[]) {
          const override = config.judge0.languageIds[lang];
          if (override) result[lang] = override;
        }
        console.log('[judge0] language ids', result);
        return result;
      })();
    }
    return this.ids;
  }

  async execute(req: ExecRequest): Promise<ExecResult> {
    const ids = await this.languageIds();
    const body = {
      source_code: b64(req.source),
      language_id: ids[req.language],
      stdin: b64(req.stdin),
      cpu_time_limit: req.cpuTimeLimit,
      wall_time_limit: req.wallTimeLimit,
      memory_limit: req.memoryLimit,
    };
    const base = config.judge0.url;
    const res = await fetch(`${base}/submissions?base64_encoded=true&wait=true`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (res.status === 429) throw new ExecutorQuotaError();
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return internalError(`Judge0 respondió ${res.status}: ${text.slice(0, 300)}`);
    }
    let sub = (await res.json()) as Judge0Submission;

    const started = Date.now();
    while ((!sub.status || sub.status.id <= 2) && sub.token) {
      if (Date.now() - started > 30_000) return internalError('Judge0 tardó demasiado');
      await new Promise((r) => setTimeout(r, 700));
      const poll = await fetch(`${base}/submissions/${sub.token}?base64_encoded=true`, { headers: this.headers() });
      if (!poll.ok) return internalError(`Judge0 respondió ${poll.status} al consultar el resultado`);
      sub = { token: sub.token, ...((await poll.json()) as Judge0Submission) };
    }

    return {
      status: mapStatus(sub.status?.id ?? 13),
      stdout: unb64(sub.stdout),
      stderr: unb64(sub.stderr),
      compileOutput: unb64(sub.compile_output),
      message: unb64(sub.message),
      timeMs: sub.time ? Math.round(Number(sub.time) * 1000) : undefined,
      memoryKb: sub.memory ?? undefined,
    };
  }
}

function mapStatus(id: number): ExecStatus {
  // https://ce.judge0.com/statuses
  if (id === 3 || id === 4) return 'ok';
  if (id === 5) return 'timeout';
  if (id === 6) return 'compile_error';
  if (id >= 7 && id <= 12) return 'runtime_error';
  return 'internal_error';
}

function internalError(message: string): ExecResult {
  return { status: 'internal_error', stdout: '', stderr: '', compileOutput: '', message };
}
