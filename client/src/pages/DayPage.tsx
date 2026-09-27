import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AttemptTiles } from '../components/Tiles';
import { api, type DaySummary, type Progress } from '../lib/api';
import { addDays, dayNumber, formatDate } from '../lib/format';
import { useAuth } from '../lib/auth';
import { errorMessage, levelKey, useI18n } from '../lib/i18n';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Boxed } from '../components/Boxed';
import { openHowToPlay } from '../components/HowToPlay';

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

function progressTone(p: Progress): string {
  if (p.solved) return 'tone-pass';
  if (p.finished) return 'tone-fail';
  if (p.attempts.length) return 'tone-partial';
  return 'tone-empty';
}

function DayCells({ day }: { day: DaySummary }) {
  return (
    <span className="tiles" aria-hidden>
      {[...day.problems]
        .sort((a, b) => a.level - b.level)
        .map((p) => (
          <span key={p.id} className={`tile ${progressTone(p.progress)}`} />
        ))}
    </span>
  );
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

  const solved = day.problems.filter((p) => p.progress.solved).length;
  const allDone = day.problems.length > 0 && day.problems.every((p) => p.progress.finished);
  const sorted = [...day.problems].sort((a, b) => a.level - b.level);

  return (
    <main className="page day-page">
      {merged ? <p className="notice ok small">{t('mergedNote', { n: merged })}</p> : null}

      {/* Cajetín de la hoja */}
      <header className="sheet-head">
        <Link to={`/day/${prev}`} className="sheet-nav prev" aria-label={formatDate(prev, lang)}>
          <ChevronLeft strokeWidth={1.75} />
        </Link>
        <div className="sheet-date">
          <h1>{formatDate(day.date, lang)}</h1>
          <p>{day.isToday ? t('tagline') : t('retroNote')}</p>
        </div>
        <div className="sheet-fields">
          <div className="sheet-field">
            <span className="field">{t('sheet')}</span>
            <strong>Nº {dayNumber(day.date)}</strong>
          </div>
          {day.isToday && countdown ? (
            <div className="sheet-field">
              <span className="field">{t('nextSheet')}</span>
              <span className="mono">{countdown}</span>
            </div>
          ) : null}
          <div className="sheet-field sheet-progress">
            <span className="field">{t('solvedField')}</span>
            <span className="row">
              <strong>
                {solved}/{day.problems.length}
              </strong>
              {day.problems.length > 0 && <DayCells day={day} />}
            </span>
          </div>
        </div>
        {day.date < day.today ? (
          <Link to={nextLink} className="sheet-nav next" aria-label={formatDate(next, lang)}>
            <ChevronRight strokeWidth={1.75} />
          </Link>
        ) : (
          <span className="sheet-nav next disabled" aria-hidden>
            <ChevronRight strokeWidth={1.75} />
          </span>
        )}
      </header>

      <p className={`day-note ${allDone ? 'done' : ''}`}>
        {day.problems.length === 0 ? null : allDone ? (
          day.isToday ? t('dayComplete') : t('dayCompleteRetro')
        ) : solved === 0 ? (
          <button className="how-link" onClick={openHowToPlay}>
            {t('howToLink')}
          </button>
        ) : null}
      </p>

      {day.problems.length === 0 ? (
        <p className="empty">{t('noProblems')}</p>
      ) : (
        <ol className="exercises">
          {sorted.map((p) => {
            const title = p.title[lang] || p.title.es;
            const state = p.progress.solved ? 'solved' : p.progress.finished ? 'failed' : '';
            return (
              <li key={p.id}>
                <Link
                  to={`/problem/${p.id}`}
                  className={`exercise level-${p.level} ${state} ${p.progress.finished ? 'finished' : ''}`}
                >
                  <span className="ex-num">
                    {p.level}
                    <span className={`badge level-${p.level}`}>{t(levelKey(p.level))}</span>
                  </span>
                  <span className="ex-main">
                    <h2>{p.progress.solved ? <Boxed>{title}</Boxed> : title}</h2>
                    <span className="ex-status">
                      <span className={`badge ex-level level-${p.level}`}>{t(levelKey(p.level))}</span>
                      <span className="ex-level"> · </span>
                      {statusText(t, p.progress)}
                    </span>
                  </span>
                  <span className="ex-tiles">
                    <AttemptTiles progress={p.progress} />
                  </span>
                  <span className="ex-go">
                    <span className="lbl">{p.progress.finished ? t('review') : t('play')}</span>
                    <ArrowRight strokeWidth={1.75} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
