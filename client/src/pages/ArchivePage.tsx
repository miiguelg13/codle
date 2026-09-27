import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArchiveList } from '../components/ArchiveList';
import { api, type ArchiveItem, type CalendarDay } from '../lib/api';
import { useAuth } from '../lib/auth';
import { errorMessage, useI18n } from '../lib/i18n';

interface MonthGrid {
  key: string; // YYYY-MM
  year: number;
  month: number; // 0-11
  cells: (string | null)[]; // fechas o huecos
}

function buildMonths(first: string, last: string): MonthGrid[] {
  const months: MonthGrid[] = [];
  let y = Number(last.slice(0, 4));
  let m = Number(last.slice(5, 7)) - 1;
  const fy = Number(first.slice(0, 4));
  const fm = Number(first.slice(5, 7)) - 1;
  while (y > fy || (y === fy && m >= fm)) {
    const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const firstWeekday = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7; // lunes = 0
    const cells: (string | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    months.push({ key: `${y}-${m}`, year: y, month: m, cells });
    m--;
    if (m < 0) {
      m = 11;
      y--;
    }
  }
  return months;
}

export default function ArchivePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [data, setData] = useState<{ today: string; days: CalendarDay[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ArchiveItem[] | null>(null);

  useEffect(() => {
    api
      .calendar()
      .then(setData)
      .catch((e) => setError(errorMessage(t, e)));
    api
      .archive()
      .then((r) => setItems(r.problems))
      .catch(() => setItems([]));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const byDate = useMemo(() => new Map((data?.days ?? []).map((d) => [d.date, d])), [data]);
  const months = useMemo(() => {
    if (!data || data.days.length === 0) return [];
    const dates = data.days.map((d) => d.date).sort();
    return buildMonths(dates[0], data.today);
  }, [data]);

  if (error) return <main className="page"><p className="error-box">{error}</p></main>;
  if (!data) return <main className="page"><p className="muted">{t('loading')}</p></main>;

  const monthNames = t('months').split(',');
  const weekdays = t('weekdays').split(',');

  return (
    <main className="page archive-page">
      <h1>{t('archive')}</h1>
      <p className="archive-intro">
        <span>
          <i className="cell tone-pass" /> {t('calAll')}
        </span>
        <span>
          <i className="cell tone-partial" /> {t('calSome')}
        </span>
        <span>
          <i className="cell tone-none" /> {t('calTried')}
        </span>
        <span>
          <i className="cell tone-empty" /> {t('calNone')}
        </span>
      </p>
      {months.length === 0 && <p className="empty">{t('noProblems')}</p>}
      <div className="months">
        {months.map((mg) => (
          <section key={mg.key} className="month">
            <h2>
              {monthNames[mg.month]} {mg.year}
            </h2>
            <div className="cal">
              {weekdays.map((w, i) => (
                <span key={`w${i}`} className="cal-wd">
                  {w}
                </span>
              ))}
              {mg.cells.map((date, i) => {
                if (!date) return <span key={i} />;
                const d = byDate.get(date);
                const dayNum = Number(date.slice(8));
                if (!d || date > data.today) {
                  return (
                    <span key={i} className="cal-day off">
                      {dayNum}
                    </span>
                  );
                }
                const tone =
                  d.solved === d.total
                    ? 'tone-pass'
                    : d.solved > 0
                      ? 'tone-partial'
                      : d.attempted > 0
                        ? 'tone-none'
                        : 'tone-empty';
                return (
                  <Link
                    key={i}
                    to={date === data.today ? '/' : `/day/${date}`}
                    className={`cal-day ${tone} ${date === data.today ? 'is-today' : ''}`}
                    title={`${d.solved}/${d.total}`}
                  >
                    <span>{dayNum}</span>
                    <small>
                      {d.solved}/{d.total}
                    </small>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {items && items.length > 0 && <ArchiveList items={items} today={data.today} />}
    </main>
  );
}
