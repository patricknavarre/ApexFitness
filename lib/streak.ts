import type { WorkoutPlan } from '@/lib/workout-plans';

function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Was `date` a scheduled rest day, per the plan cycle anchored at planStartedAt? */
function isScheduledRestDay(
  date: Date,
  plan: WorkoutPlan | null,
  planStartedAt: string | null
): boolean {
  if (!plan || !planStartedAt || plan.days.length === 0) return false;
  const [y, m, d] = planStartedAt.split('-').map(Number);
  if (!y || !m || !d) return false;
  const start = new Date(y, m - 1, d);
  start.setHours(0, 0, 0, 0);
  const cur = new Date(date);
  cur.setHours(0, 0, 0, 0);
  const diff = Math.floor((cur.getTime() - start.getTime()) / 86400000);
  if (diff < 0) return false;
  return plan.days[diff % plan.days.length].isRest;
}

/**
 * Consecutive completed workouts ending today.
 * - Scheduled rest days bridge the streak (do not break it, do not add to it).
 * - Today not being logged yet does not break the streak (grace until it's missed).
 * - Breaks only when a past scheduled workout day has no log.
 * With no active plan, degrades to consecutive logged days (still with today grace).
 */
export function computeWorkoutStreak(
  loggedDates: Set<string>,
  plan: WorkoutPlan | null,
  planStartedAt: string | null
): number {
  let streak = 0;
  let d = new Date();
  d.setHours(12, 0, 0, 0);
  for (let i = 0; i < 400; i++) {
    const logged = loggedDates.has(localKey(d));
    const isToday = i === 0;
    if (logged) {
      streak++;
    } else if (isToday) {
      // grace: today not done yet — don't break, don't count
    } else if (isScheduledRestDay(d, plan, planStartedAt)) {
      // planned rest bridges the streak
    } else {
      break; // missed a scheduled workout
    }
    d = new Date(d.getTime() - 86400000);
  }
  return streak;
}

/** Number of days in the last 7 (including today) that have a logged workout. */
export function countDaysThisWeek(loggedDates: Set<string>): number {
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    if (loggedDates.has(localKey(d))) count++;
  }
  return count;
}
