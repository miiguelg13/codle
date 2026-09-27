import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ArchiveItem, ArchiveStatus } from '../lib/api';
import { levelKey, useI18n } from '../lib/i18n';

const STATUSES: ArchiveStatus[] = ['new', 'attempted', 'solved', 'failed'];

function shortDate(date: string, lang: 'es' | 'en', today: string): string {
  const d = new Date(date + 'T12:00:00Z');
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  });
}

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function ArchiveList({ items, today }: { items: ArchiveItem[]; today: string }) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<number | null>(null);
  const [tag, setTag] = useState('');
  const [status, setStatus] = useState<ArchiveStatus | ''>('');

  const tags = useMemo(() => {
    const count = new Map<string, number>();
    for (const it of items) for (const tg of it.tags) count.set(tg, (count.get(tg) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);
  }, [items]);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return items.filter((it) => {
      if (level && it.level !== level) return false;
      if (tag && !it.tags.includes(tag)) return false;
      if (status && it.status !== status) return false;
      if (q) {
        const hay = norm([it.title.es, it.title.en, it.slug, ...it.tags].join(' '));
        if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    });
  }, [items, query, level, tag, status]);

  const active = !!(query || level || tag || status);
  const clear = () => {
    setQuery('');
    setLevel(null);
    setTag('');
    setStatus('');
  };

  return (
    <section className="archive-list">
      <h2>{t('allProblems')}</h2>
      <div className="archive-filters">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
        />
        <div className="seg level-seg" role="group" aria-label={t('allLevels')}>
          <button className={level === null ? 'active' : ''} onClick={() => setLevel(null)}>
            {t('allLevels')}
          </button>
          {[1, 2, 3, 4].map((l) => (
            <button
              key={l}
              className={`level-${l} ${level === l ? 'active' : ''}`}
              onClick={() => setLevel(level === l ? null : l)}
              aria-pressed={level === l}
            >
              {t(levelKey(l))}
            </button>
          ))}
        </div>
        <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label={t('allTags')}>
          <option value="">{t('allTags')}</option>
          {tags.map((tg) => (
            <option key={tg} value={tg}>
              {tg}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as ArchiveStatus | '')} aria-label={t('anyStatus')}>
          <option value="">{t('anyStatus')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status_${s}`)}
            </option>
          ))}
        </select>
      </div>

      <p className="muted small archive-count">
        {t('resultsCount', { n: filtered.length })}
        {active && (
          <>
            {' · '}
            <button className="how-link" onClick={clear}>
              {t('clearFilters')}
            </button>
          </>
        )}
      </p>

      {filtered.length === 0 ? (
        <p className="empty">{t('noResults')}</p>
      ) : (
        <ul className="archive-rows">
          {filtered.map((it) => (
            <li key={it.id}>
              <Link to={`/problem/${it.id}`} className={`archive-row status-${it.status}`}>
                <span className={`archive-status status-${it.status}`} title={t(`status_${it.status}`)} aria-label={t(`status_${it.status}`)}>
                  {it.status === 'solved' && <Check strokeWidth={3} />}
                  {it.status === 'failed' && <X strokeWidth={3} />}
                </span>
                <span className="archive-date muted">
                  {shortDate(it.date, lang, today)}
                  {it.date === today && <span className="today-mark"> · {t('todayMark')}</span>}
                </span>
                <span className={`badge level-${it.level}`}>{t(levelKey(it.level))}</span>
                <span className="archive-title">{it.title[lang] || it.title.es}</span>
                <span className="archive-tags">
                  {it.tags.slice(0, 3).map((tg) => (
                    <span
                      key={tg}
                      className={`tag-chip ${tg === tag ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setTag(tg === tag ? '' : tg);
                      }}
                    >
                      {tg}
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
