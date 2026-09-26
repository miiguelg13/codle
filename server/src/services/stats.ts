import { config } from '../config.js';
import { Problem } from '../models/Problem.js';
import { Progress } from '../models/Progress.js';
import { addDays, today } from './dates.js';

export interface Streaks {
  current: number;
  max: number;
  /** true si hoy ya ha sumado a la racha */
  todayDone: boolean;
}

export function computeStreaks(streakDates: Iterable<string>, todayStr: string): Streaks {
  const set = new Set(streakDates);
  const sorted = [...set].sort();
  let max = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    if (run > max) max = run;
    prev = d;
  }
  const todayDone = set.has(todayStr);
  let cursor = todayDone ? todayStr : addDays(todayStr, -1);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, max, todayDone };
}

export async function getStreaks(playerId: string): Promise<Streaks> {
  const dates: string[] = await Progress.distinct('date', { playerId, solvedOnDay: true });
  return computeStreaks(dates, today());
}

type LevelStats = {
  level: number;
  attempted: number;
  solved: number;
  failed: number;
  /** distribution[i] = retos resueltos en i+1 envíos */
  distribution: number[];
};

export async function getStats(playerId: string) {
  const t = today();
  const progress = await Progress.find({ playerId })
    .select('date level solved solvedOnDay attempts.language attempts.passed attempts.total')
    .lean();

  const emptyDist = () => new Array(config.maxAttempts).fill(0) as number[];
  const levels: LevelStats[] = [1, 2, 3, 4].map((level) => ({
    level,
    attempted: 0,
    solved: 0,
    failed: 0,
    distribution: emptyDist(),
  }));
  const distribution = emptyDist();
  const languages: Record<string, number> = {};
  let attempted = 0;
  let solved = 0;
  let failed = 0;
  let submissions = 0;
  const solvedOnDayByDate = new Map<string, number>();
  const daysPlayed = new Set<string>();

  for (const p of progress) {
    const n = p.attempts?.length ?? 0;
    if (n === 0) continue;
    const lv = levels[p.level - 1];
    attempted++;
    submissions += n;
    daysPlayed.add(p.date);
    if (lv) lv.attempted++;
    if (p.solved) {
      solved++;
      distribution[Math.min(n, config.maxAttempts) - 1]++;
      if (lv) {
        lv.solved++;
        lv.distribution[Math.min(n, config.maxAttempts) - 1]++;
      }
      const lang = p.attempts[n - 1]?.language;
      if (lang) languages[lang] = (languages[lang] ?? 0) + 1;
      if (p.solvedOnDay) solvedOnDayByDate.set(p.date, (solvedOnDayByDate.get(p.date) ?? 0) + 1);
    } else if (n >= config.maxAttempts) {
      failed++;
      if (lv) lv.failed++;
    }
  }

  let perfectDays = 0;
  if (solvedOnDayByDate.size) {
    const counts = await Problem.aggregate<{ _id: string; total: number }>([
      { $match: { status: 'published', date: { $in: [...solvedOnDayByDate.keys()] } } },
      { $group: { _id: '$date', total: { $sum: 1 } } },
    ]);
    for (const c of counts) if ((solvedOnDayByDate.get(c._id) ?? 0) >= c.total) perfectDays++;
  }

  const streak = computeStreaks(solvedOnDayByDate.keys(), t);
  return {
    today: t,
    maxAttempts: config.maxAttempts,
    attempted,
    solved,
    failed,
    inProgress: attempted - solved - failed,
    submissions,
    solveRate: attempted ? solved / attempted : 0,
    daysPlayed: daysPlayed.size,
    perfectDays,
    streak,
    distribution,
    levels,
    languages,
  };
}
