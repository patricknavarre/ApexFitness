import { diffLocalCalendarDays, todayLocal } from '@/lib/local-date';
import type { WorkoutPlan } from '@/lib/workout-plans';

function localKey(d: Date): string {
  return todayLocal(d);
}

/** Was `date` a scheduled rest day, per the plan cycle anchored at planStartedAt? */
function isScheduledRestDay(
  date: Date,
  plan: WorkoutPlan | null,
  planStartedAt: string | null
): boolean {
  if (!plan || !planStartedAt || plan.days.length === 0) return false;
  const diff = diffLocalCalendarDays(planStartedAt.slice(0, 10), localKey(date));
  if (diff == null || diff < 0) return false;
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
