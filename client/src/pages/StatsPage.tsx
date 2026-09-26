import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Language, type Stats } from '../lib/api';
import { useAuth } from '../lib/auth';
import { LANGUAGE_LABELS } from '../lib/format';
import { errorMessage, levelKey, useI18n } from '../lib/i18n';

function Distribution({ dist, failed, max }: { dist: number[]; failed: number; max: number }) {
  const { t } = useI18n();
  const top = Math.max(1, ...dist, failed);
  const rows = [
    ...dist.map((n, i) => ({ label: String(i + 1), n, tone: 'tone-pass' })),
    { label: t('failedLabel'), n: failed, tone: 'tone-fail' },
  ];
  return (
    <div className="dist" aria-label={t('distribution')}>
      {rows.slice(0, max + 1).map((r) => (
        <div className="dist-row" key={r.label}>
          <span className="dist-label">{r.label}</span>
          <div className="dist-track">
            <div className={`dist-bar ${r.n ? r.tone : 'tone-none'}`} style={{ width: `${Math.max(7, (r.n / top) * 100)}%` }}>
              {r.n}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StatsPage() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .stats()
      .then(setStats)
      .catch((e) => setError(errorMessage(t, e)));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <main className="page"><p className="error-box">{error}</p></main>;
  if (!stats) return <main className="page"><p className="muted">{t('loading')}</p></main>;

  const tiles = [
    { label: t('played'), value: stats.attempted },
    { label: t('solveRate'), value: `${Math.round(stats.solveRate * 100)}` },
    { label: t('currentStreak'), value: stats.streak.current, accent: true },
    { label: t('maxStreak'), value: stats.streak.max },
    { label: t('perfectDays'), value: stats.perfectDays },
    { label: t('daysPlayed'), value: stats.daysPlayed },
  ];
  const langs = Object.entries(stats.languages).sort((a, b) => b[1] - a[1]) as [Language, number][];
  const langTop = Math.max(1, ...langs.map(([, n]) => n));

  return (
    <main className="page stats-page">
      <h1>{t('stats')}</h1>

      {!authLoading && !user && (
        <div className="notice">
          <span>{t('guestStatsNote')}</span>
          <Link to="/login?mode=register&next=/stats" className="btn primary">
            {t('register')}
          </Link>
        </div>
      )}

      <section className="stat-tiles">
        {tiles.map((s) => (
          <div key={s.label} className={`stat-tile ${s.accent ? 'accent' : ''}`}>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </section>

      {stats.attempted === 0 ? (
        <div className="empty">
          <p>{t('noStats')}</p>
          <Link to="/" className="btn primary">
            {t('goToday')}
          </Link>
        </div>
      ) : (
        <>
          <section className="panel">
            <h2>{t('distribution')}</h2>
            <p className="muted small">{t('distributionHint')}</p>
            <Distribution dist={stats.distribution} failed={stats.failed} max={stats.maxAttempts} />
          </section>

          <section className="panel">
            <h2>{t('byLevel')}</h2>
            <div className="level-stats">
              {stats.levels.map((l) => (
                <div key={l.level} className={`level-stat level-${l.level}`}>
                  <div className="level-stat-head">
                    <span className={`badge level-${l.level}`}>{t(levelKey(l.level))}</span>
                    <span className="mono small">
                      {t('ofAttempted', { s: l.solved, a: l.attempted })}
                    </span>
                  </div>
                  <div className="meter" title={`${l.solved}/${l.attempted}`}>
                    <div style={{ width: `${l.attempted ? (l.solved / l.attempted) * 100 : 0}%` }} />
                  </div>
                  <div className="mini-dist">
                    {l.distribution.map((n, i) => (
                      <span key={i} title={`${i + 1}: ${n}`}>
                        <i style={{ height: `${l.solved ? 4 + (n / Math.max(...l.distribution, 1)) * 28 : 4}px` }} />
                        <small>{i + 1}</small>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {langs.length > 0 && (
            <section className="panel">
              <h2>{t('byLanguage')}</h2>
              <div className="dist">
                {langs.map(([lang, n]) => (
                  <div className="dist-row" key={lang}>
                    <span className="dist-label wide">{LANGUAGE_LABELS[lang] ?? lang}</span>
                    <div className="dist-track">
                      <div className="dist-bar tone-lang" style={{ width: `${Math.max(7, (n / langTop) * 100)}%` }}>
                        {n}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
