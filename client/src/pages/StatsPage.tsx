import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Language, type Stats } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Tally } from '../components/Tally';
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

  const ledger: { label: string; value: number; suffix?: string; tally?: boolean; accent?: boolean }[] = [
    { label: t('played'), value: stats.attempted, tally: true },
    { label: t('solveRate'), value: Math.round(stats.solveRate * 100), suffix: '%' },
    { label: t('currentStreak'), value: stats.streak.current, tally: true, accent: true },
    { label: t('maxStreak'), value: stats.streak.max, tally: true },
    { label: t('perfectDays'), value: stats.perfectDays, tally: true },
    { label: t('daysPlayed'), value: stats.daysPlayed, tally: true },
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

      <section className="ledger">
        {ledger.map((r) => (
          <div key={r.label} className={`ledger-row ${r.accent ? 'accent' : ''}`}>
            <span className="ledger-label">{r.label}</span>
            <span className="ledger-marks">{r.tally && r.value > 0 && r.value <= 30 && <Tally n={r.value} max={30} />}</span>
            <strong className="ledger-value">
              {r.value}
              {r.suffix}
            </strong>
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
            {stats.distribution.some((n) => n > 0) || stats.failed > 0 ? (
              <Distribution dist={stats.distribution} failed={stats.failed} max={stats.maxAttempts} />
            ) : (
              <p className="ledger-empty">{t('noSolvedYet')}</p>
            )}
          </section>

          <section className="panel">
            <h2>{t('byLevel')}</h2>
            <div className="ledger single">
              {stats.levels.map((l) => (
                <div key={l.level} className={`ledger-row level-${l.level}`}>
                  <span className="ledger-label">
                    <span className={`badge level-${l.level}`}>{t(levelKey(l.level))}</span>
                    {l.solved > 0 && (
                      <span className="ledger-sub">
                        {l.distribution
                          .map((n, i) => (n ? `${n}×${i + 1}` : ''))
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
                  </span>
                  <span className="ledger-marks">{l.solved > 0 && l.solved <= 30 && <Tally n={l.solved} max={30} />}</span>
                  <strong className="ledger-value small-value">
                    {l.attempted ? t('ofAttempted', { s: l.solved, a: l.attempted }) : '—'}
                  </strong>
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
