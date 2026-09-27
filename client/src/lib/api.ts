export const LANGUAGES = ['python', 'javascript', 'typescript', 'java', 'cpp', 'csharp', 'go', 'rust'] as const;
export type Language = (typeof LANGUAGES)[number];
export type Verdict = 'pass' | 'fail' | 'error' | 'timeout' | 'skipped';
export type I18nText = { es: string; en: string };

export interface Attempt {
  at: string;
  language: Language;
  verdicts: Verdict[];
  passed: number;
  total: number;
  timeMs?: number;
}

export interface Progress {
  attempts: Attempt[];
  solved: boolean;
  solvedOnDay: boolean;
  finished: boolean;
  maxAttempts: number;
}

export interface Meta {
  today: string;
  msUntilNextDay: number;
  maxAttempts: number;
  languages: Language[];
}

export interface DaySummary {
  date: string;
  today: string;
  isToday: boolean;
  problems: { id: string; slug: string; level: number; title: I18nText; progress: Progress }[];
}

export interface CalendarDay {
  date: string;
  total: number;
  solved: number;
  attempted: number;
  failed: number;
}

export type ArchiveStatus = 'new' | 'attempted' | 'solved' | 'failed';

export interface ArchiveItem {
  id: string;
  slug: string;
  date: string;
  level: number;
  title: I18nText;
  tags: string[];
  status: ArchiveStatus;
  attempts: number;
}

export interface Param {
  name: string;
  type: string;
}

export interface ProblemDetail {
  id: string;
  slug: string;
  date: string;
  level: number;
  title: I18nText;
  statement: I18nText;
  constraints: string[];
  signature: { functionName: string; params: Param[]; returnType: string };
  compare: 'exact' | 'unordered' | 'unordered-deep';
  examples: { input: unknown[]; output: unknown; explanation?: I18nText }[];
  totalTests: number;
  starterCode: Record<Language, string>;
  lastCode: Partial<Record<Language, string>>;
  progress: Progress;
  referenceSolution: { language: string; code: string } | null;
  editorial?: I18nText | null;
}

export interface RunCase {
  input: unknown[];
  expected: unknown;
  actual?: unknown;
  rawActual?: string;
  verdict: Verdict;
  error?: string;
  logs: string;
  timeMs?: number;
}

export interface RunResponse {
  status: 'ok' | 'compile_error';
  errorOutput: string;
  globalLogs: string;
  timeMs?: number;
  cases: RunCase[];
}

export type SubmitResponse =
  | { status: 'compile_error'; errorOutput: string; progress: Progress }
  | {
      status: 'ok';
      attempt: Attempt;
      solved: boolean;
      progress: Progress;
      firstFailure: {
        index: number;
        verdict: Verdict;
        error?: string;
        example?: { input: unknown[]; expected: unknown; actual?: unknown };
      } | null;
      referenceSolution: { language: string; code: string } | null;
      editorial?: I18nText | null;
    };

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const RUN_TIMEOUT_MS = 150_000;

function timeoutSignal(ms: number): AbortSignal | undefined {
  try {
    return AbortSignal.timeout(ms);
  } catch {
    return undefined; // navegadores antiguos
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isGet = !init?.method || init.method === 'GET';
  for (let attempt = 0; ; attempt++) {
    try {
      return await requestOnce<T>(path, init);
    } catch (err) {
      const retriable =
        isGet &&
        attempt < 20 &&
        (!(err instanceof ApiError) || (err.status >= 500 && err.code === 'server_unavailable'));
      if (!retriable) throw err;
      await sleep(1500);
    }
  }
}

async function requestOnce<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === 'TimeoutError' || name === 'AbortError') throw new ApiError(0, 'timeout', 'timeout');
    throw new ApiError(0, 'network', String(err));
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: 'bad_response', message: text };
  }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; message?: string };
    const fallback = res.status === 429 ? 'rate_limited' : res.status >= 500 ? 'server_unavailable' : 'error';
    throw new ApiError(res.status, d.error ?? fallback, d.message ?? text);
  }
  return data as T;
}

export interface User {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

export interface Streaks {
  current: number;
  max: number;
  todayDone: boolean;
}

export interface Me {
  user: User | null;
  streak: Streaks;
}

export interface LevelStats {
  level: number;
  attempted: number;
  solved: number;
  failed: number;
  distribution: number[];
}

export interface Stats {
  today: string;
  maxAttempts: number;
  attempted: number;
  solved: number;
  failed: number;
  inProgress: number;
  submissions: number;
  solveRate: number;
  daysPlayed: number;
  perfectDays: number;
  streak: Streaks;
  distribution: number[];
  levels: LevelStats[];
  languages: Partial<Record<Language, number>>;
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const api = {
  me: () => request<Me>('/auth/me'),
  register: (email: string, username: string, password: string) =>
    request<{ user: User; merged: number }>('/auth/register', post({ email, username, password })),
  login: (login: string, password: string) =>
    request<{ user: User; merged: number }>('/auth/login', post({ login, password })),
  logout: () => request<{ ok: true }>('/auth/logout', post({})),
  stats: () => request<Stats>('/stats'),
  meta: () => request<Meta>('/meta'),
  calendar: () => request<{ today: string; days: CalendarDay[] }>('/calendar'),
  archive: () => request<{ today: string; problems: ArchiveItem[] }>('/archive'),
  day: (date: string) => request<DaySummary>(`/days/${date}`),
  problem: (id: string) => request<ProblemDetail>(`/problems/${id}`),
  run: (id: string, language: Language, code: string) =>
    request<RunResponse>(`/problems/${id}/run`, {
      method: 'POST',
      body: JSON.stringify({ language, code }),
      signal: timeoutSignal(RUN_TIMEOUT_MS),
    }),
  submit: (id: string, language: Language, code: string) =>
    request<SubmitResponse>(`/problems/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ language, code }),
      signal: timeoutSignal(RUN_TIMEOUT_MS),
    }),
};
