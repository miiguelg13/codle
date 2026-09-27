import type { Language } from './api';

export const LANGUAGE_LABELS: Record<Language, string> = {
  python: 'Python 3',
  javascript: 'JavaScript',
  java: 'Java',
  cpp: 'C++',
  go: 'Go',
  rust: 'Rust',
  csharp: 'C#',
  typescript: 'TypeScript',
};

export function formatMs(ms: number | undefined | null): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  if (ms < 1) return `${ms.toFixed(2)} ms`;
  if (ms < 10) return `${ms.toFixed(1)} ms`;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
}

export function formatValue(v: unknown, max = 400): string {
  if (v === undefined) return '—';
  const s = JSON.stringify(v);
  if (s.length <= max) return s;
  const len = Array.isArray(v) ? ` (${v.length} elementos)` : '';
  return s.slice(0, max) + `…${len}`;
}

export function formatDate(date: string, lang: 'es' | 'en'): string {
  const d = new Date(date + 'T12:00:00Z');
  return d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Número de "día de juego", como el nº de Wordle. */
export function dayNumber(date: string): number {
  const epoch = Date.UTC(2026, 0, 1);
  return Math.floor((Date.parse(date + 'T00:00:00Z') - epoch) / 86_400_000) + 1;
}
