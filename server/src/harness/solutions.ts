import { LANGUAGES, type Language } from './types.js';

export const SOLUTION_EXT: Record<Language, string> = {
  python: 'py',
  javascript: 'js',
  typescript: 'ts',
  java: 'java',
  cpp: 'cpp',
  csharp: 'cs',
  go: 'go',
  rust: 'rs',
};

export type SolutionStatus = 'pending' | 'ok' | 'failed';

export interface StoredSolution {
  language: Language;
  code: string;
  status: SolutionStatus;
  error?: string;
  checkedAt?: Date;
}

export const MAX_SOLUTION_BYTES = 64 * 1024;

export function validateSolutions(value: unknown, label: string): string | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return `${label}: solutions debe ser una lista`;
  const seen = new Set<string>();
  for (const s of value as { language?: unknown; code?: unknown }[]) {
    if (!s || typeof s.language !== 'string' || !(LANGUAGES as readonly string[]).includes(s.language))
      return `${label}: lenguaje de solución no válido (${String(s?.language)})`;
    if (s.language === 'python') return `${label}: la solución en Python va en referenceSolution`;
    if (seen.has(s.language)) return `${label}: solución repetida en ${s.language}`;
    seen.add(s.language);
    if (typeof s.code !== 'string' || !s.code.trim()) return `${label}: solución vacía en ${s.language}`;
    if (Buffer.byteLength(s.code, 'utf8') > MAX_SOLUTION_BYTES) return `${label}: solución demasiado larga en ${s.language}`;
  }
  return null;
}

export function mergeSolutions(
  incoming: { language: string; code: string }[] | undefined,
  existing: StoredSolution[] | undefined,
): StoredSolution[] {
  const old = new Map((existing ?? []).map((s) => [s.language, s]));
  return (incoming ?? [])
    .filter((s) => s.language !== 'python')
    .map((s) => {
      const prev = old.get(s.language as Language);
      if (prev && prev.code === s.code) return { ...prev };
      return { language: s.language as Language, code: s.code, status: 'pending' as const };
    });
}

export function publicSolutions(
  reference: { language?: string | null; code?: string | null } | null | undefined,
  solutions: StoredSolution[] | undefined,
): { language: Language; code: string }[] {
  const out = new Map<Language, string>();
  if (reference?.code && reference.language) out.set(reference.language as Language, reference.code);
  for (const s of solutions ?? []) if (s.status === 'ok' && !out.has(s.language)) out.set(s.language, s.code);
  return LANGUAGES.filter((l) => out.has(l)).map((l) => ({ language: l, code: out.get(l)! }));
}
