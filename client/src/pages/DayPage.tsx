import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AttemptTiles } from '../components/Tiles';
import { api, type DaySummary, type Progress } from '../lib/api';
import { addDays, dayNumber, formatDate } from '../lib/format';
import { useAuth } from '../lib/auth';
import { errorMessage, levelKey, useI18n } from '../lib/i18n';

function useCountdown(ms: number | null) {
  const [left, setLeft] = useState(ms);
  useEffect(() => {
    if (ms == null) return;
    const end = Date.now() + ms;
    setLeft(ms);
    const id = setInterval(() => setLeft(Math.max(0, end - Date.now())), 1000);
    return () => clearInterval(id);
  }, [ms]);
  if (left == null) return null;
  const s = Math.floor(left / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

function statusText(t: ReturnType<typeof useI18n>['t'], p: Progress): string {
  if (p.solved) return t('solvedIn', { n: p.attempts.length, max: p.maxAttempts });
  if (p.finished) return t('outOfAttempts');
  if (p.attempts.length) return t('attemptsUsed', { n: p.attempts.length, max: p.maxAttempts });
  return t('notStarted');
}

export default function DayPage() {
  const { date: dateParam } = useParams();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const location = useLocation();
  const merged = (location.state as { merged?: number } | null)?.merged;
  const [day, setDay] = useState<DaySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nextMs, setNextMs] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setDay(null);
    setError(null);
    api
      .day(dateParam ?? 'today')
      .then((d) => alive && setDay(d))
      .catch((e) => alive && setError(errorMessage(t, e)));
    return () => {
      alive = false;
    };
  }, [dateParam, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.meta().then((m) => setNextMs(m.msUntilNextDay)).catch(() => {});
  }, []);
  const countdown = useCountdown(day?.isToday ? nextMs : null);

  if (error) return <main className="page"><p className="error-box">{error}</p></main>;
  if (!day) return <main className="page"><p className="muted">{t('loading')}</p></main>;

  const prev = addDays(day.date, -1);
  const next = addDays(day.date, 1);
  const nextLink = next === day.today ? '/' : `/day/${next}`;

  return (
    <main className="page day-page">
      {merged ? <p className="notice ok small">{t('mergedNote', { n: merged })}</p> : null}
      <section className="day-head">
        <div className="day-nav">
          <Link to={`/day/${prev}`} className="icon-btn" aria-label="←">
            ←
          </Link>
          <div className="day-title">
            <span className="day-number">#{dayNumber(day.date)}</span>
            <h1>{formatDate(day.date, lang)}</h1>
          </div>
          {day.date < day.today ? (
            <Link to={nextLink} className="icon-btn" aria-label="→">
              →
            </Link>
          ) : (
            <span className="icon-btn disabled">→</span>
          )}
        </div>
        <p className="tagline">
          {day.isToday && countdown ? (
            <>
              {t('nextIn')} <span className="mono">{countdown}</span>
            </>
          ) : !day.isToday ? (
            t('retroNote')
          ) : (
            t('tagline')
          )}
        </p>
      </section>

      {day.problems.length === 0 ? (
        <p className="empty">{t('noProblems')}</p>
      ) : (
        <section className="cards">
          {day.problems.map((p) => (
            <Link key={p.id} to={`/problem/${p.id}`} className={`card level-${p.level}`}>
              <div className="card-top">
                <span className={`badge level-${p.level}`}>{t(levelKey(p.level))}</span>
                {p.progress.solved && <span className="check">✓</span>}
              </div>
              <h2>{p.title[lang] || p.title.es}</h2>
              <AttemptTiles progress={p.progress} />
              <div className="card-foot">
                <span className="muted">{statusText(t, p.progress)}</span>
                <span className="card-cta">{p.progress.finished ? t('review') : t('play')} →</span>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
