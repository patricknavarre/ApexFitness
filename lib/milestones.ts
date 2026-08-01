import { todayLocal } from '@/lib/local-date';

export type Milestone = {
  id: string;
  label: string;
  description: string;
  earned: boolean;
  progress: number;
  target: number;
};

export type NextGoal = {
  label: string;
  progress: number;
  target: number;
  remaining: number;
};

export type MomentumInput = {
  loggedDates: Set<string>;
  streak: number;
  daysThisWeek: number;
  /** Day-level workout logs (plan/cardio completions), not set-only logs */
  totalWorkouts: number;
  photoCount: number;
  /** Body weight change in lbs (latest − first). Negative = lost weight. */
  weightDeltaLbs?: number | null;
  weekGoal?: number;
};

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Mon–Sun keys for the current local week (Mon start). */
export function getCurrentWeekDayKeys(today = todayLocal()): { label: string; key: string }[] {
  const [y, m, d] = today.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  const jsDay = date.getDay(); // 0 Sun … 6 Sat
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);

  return WEEKDAY_SHORT.map((label, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const key = todayLocal(day);
    return { label, key };
  });
}

export function buildMilestones(input: MomentumInput): Milestone[] {
  const {
    streak,
    daysThisWeek,
    totalWorkouts,
    photoCount,
    weightDeltaLbs,
    weekGoal = 5,
  } = input;

  const milestones: Milestone[] = [
    {
      id: 'first-workout',
      label: 'First workout',
      description: 'Log your first training session',
      earned: totalWorkouts >= 1,
      progress: Math.min(totalWorkouts, 1),
      target: 1,
    },
    {
      id: 'streak-3',
      label: '3-day streak',
      description: 'Train three days in a row',
      earned: streak >= 3,
      progress: Math.min(streak, 3),
      target: 3,
    },
    {
      id: 'streak-7',
      label: '7-day streak',
      description: 'Keep the fire going a full week',
      earned: streak >= 7,
      progress: Math.min(streak, 7),
      target: 7,
    },
    {
      id: 'week-5',
      label: `${weekGoal} days this week`,
      description: `Hit your ${weekGoal}-day weekly goal`,
      earned: daysThisWeek >= weekGoal,
      progress: Math.min(daysThisWeek, weekGoal),
      target: weekGoal,
    },
    {
      id: 'first-photo',
      label: 'First progress photo',
      description: 'Save a photo from AI Analysis',
      earned: photoCount >= 1,
      progress: Math.min(photoCount, 1),
      target: 1,
    },
  ];

  if (typeof weightDeltaLbs === 'number' && !Number.isNaN(weightDeltaLbs)) {
    const lost = weightDeltaLbs <= -5;
    milestones.push({
      id: 'lost-5',
      label: 'Lost 5 lbs',
      description: 'Drop 5 lbs from your first progress photo',
      earned: lost,
      progress: lost ? 5 : Math.min(5, Math.max(0, -weightDeltaLbs)),
      target: 5,
    });
  }

  return milestones;
}

/** Prefer weekly goal, then next streak milestone, then first photo. */
export function getNextGoal(milestones: Milestone[], streak: number, daysThisWeek: number, weekGoal = 5): NextGoal | null {
  const weekMs = milestones.find((m) => m.id === 'week-5');
  if (weekMs && !weekMs.earned) {
    return {
      label: `${weekGoal - daysThisWeek} more day${weekGoal - daysThisWeek === 1 ? '' : 's'} → hit ${weekGoal} this week`,
      progress: daysThisWeek,
      target: weekGoal,
      remaining: weekGoal - daysThisWeek,
    };
  }

  const streakTargets = [3, 7, 14, 30];
  const nextStreak = streakTargets.find((t) => streak < t);
  if (nextStreak != null) {
    return {
      label: `${nextStreak - streak} more training day${nextStreak - streak === 1 ? '' : 's'} → ${nextStreak}-day streak`,
      progress: streak,
      target: nextStreak,
      remaining: nextStreak - streak,
    };
  }

  const photo = milestones.find((m) => m.id === 'first-photo');
  if (photo && !photo.earned) {
    return {
      label: 'Save your first progress photo',
      progress: 0,
      target: 1,
      remaining: 1,
    };
  }

  const uneared = milestones.find((m) => !m.earned);
  if (uneared) {
    return {
      label: uneared.description,
      progress: uneared.progress,
      target: uneared.target,
      remaining: Math.max(0, uneared.target - uneared.progress),
    };
  }

  return {
    label: 'All milestones unlocked — keep showing up',
    progress: 1,
    target: 1,
    remaining: 0,
  };
}
