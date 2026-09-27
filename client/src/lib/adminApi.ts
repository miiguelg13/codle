import { request } from './api';
import type { I18nText, Language, Verdict } from './api';

export const VALUE_TYPES = [
  'int',
  'long',
  'double',
  'bool',
  'string',
  'int[]',
  'long[]',
  'double[]',
  'bool[]',
  'string[]',
  'int[][]',
  'string[][]',
] as const;
export type ValueType = (typeof VALUE_TYPES)[number];
export type ProblemStatus = 'draft' | 'pending' | 'published' | 'rejected';

export interface AdminCase {
  input: unknown[];
  output?: unknown;
  explanation?: I18nText;
}

export interface AdminProblem {
  id?: string;
  slug: string;
  date: string;
  level: number;
  status: ProblemStatus;
  source?: string;
  title: I18nText;
  statement: I18nText;
  constraints: string[];
  tags: string[];
  signature: { functionName: string; params: { name: string; type: ValueType }[]; returnType: ValueType };
  compare: 'exact' | 'unordered' | 'unordered-deep';
  timeLimit: number;
  examples: AdminCase[];
  tests: AdminCase[];
  referenceSolution: { language: Language; code: string } | null;
  editorial?: I18nText | null;
  players?: number;
}

export interface AdminListItem {
  id: string;
  slug: string;
  date: string;
  level: number;
  status: ProblemStatus;
  source: string;
  title: I18nText;
  tags: string[];
  players: number;
  solved: number;
  submissions: number;
}

export interface AdminOverview {
  today: string;
  users: number;
  players: number;
  submissions24h: number;
  problemsByStatus: Partial<Record<ProblemStatus, number>>;
  nextDays: { date: string; published: number }[];
}

export interface TryResult {
  status: 'ok' | 'compile_error';
  errorOutput: string;
  timeMs?: number;
  results: { index: number; kind: 'example' | 'test'; verdict: Verdict; error?: string; actual?: unknown; expected: unknown }[];
}

export interface ImportReport {
  imported: string[];
  updated: string[];
  skipped: string[];
  errors: string[];
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

/** Quita los campos que no se envían al guardar. */
function payload(p: AdminProblem) {
  const { id: _id, source: _source, players: _players, ...rest } = p;
  return rest;
}

export const adminApi = {
  overview: () => request<AdminOverview>('/admin/overview'),
  list: (q: { status?: string; q?: string; from?: string; to?: string }) => {
    const params = new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][]);
    return request<AdminListItem[]>(`/admin/problems?${params}`);
  },
  get: (id: string) => request<AdminProblem>(`/admin/problems/${id}`),
  create: (p: AdminProblem) => request<AdminProblem>('/admin/problems', json('POST', payload(p))),
  update: (id: string, p: AdminProblem) => request<AdminProblem>(`/admin/problems/${id}`, json('PUT', payload(p))),
  setStatus: (id: string, status: ProblemStatus) =>
    request<AdminProblem>(`/admin/problems/${id}/status`, json('POST', { status })),
  remove: (id: string) => request<{ ok: true }>(`/admin/problems/${id}`, { method: 'DELETE' }),
  computeOutputs: (p: AdminProblem) =>
    request<{ examples: AdminCase[]; tests: AdminCase[]; timeMs?: number }>(
      '/admin/tools/compute-outputs',
      json('POST', { problem: payload(p) }),
    ),
  tryCode: (p: AdminProblem, language: Language, code: string) =>
    request<TryResult>('/admin/tools/try', json('POST', { problem: payload(p), language, code })),
  importNow: () => request<ImportReport>('/admin/tools/import', json('POST', {})),
  uploadDay: (text: string) => request<ImportReport>('/retos/upload', { method: 'POST', body: text }),
};

export const STATUS_LABEL: Record<ProblemStatus, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  published: 'Publicado',
  rejected: 'Retirado',
};

export const SOURCE_LABEL: Record<string, string> = {
  seed: 'Ejemplo',
  ai: 'Agente',
  admin: 'Manual',
};
