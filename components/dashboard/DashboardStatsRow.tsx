'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WORKOUT_PLANS, getActivePlanDay } from '@/lib/workout-plans';
import { computeWorkoutStreak, countDaysThisWeek } from '@/lib/streak';
import { toLocalDateOnly } from '@/lib/local-date';
import { useLocalTodayKey } from '@/lib/use-local-today-key';

function getWorkoutLabel(
  activePlanId: string | null,
  planStartedAt: string | null,
  activePlanDayNumber: number | null,
  activePlanDaySetOn: string | null,
  today: string
): string {
  if (!activePlanId || !planStartedAt) return 'No plan';
  const plan = WORKOUT_PLANS.find((p) => p.id === activePlanId);
  if (!plan) return 'No plan';
  const activeDay = getActivePlanDay(
    plan,
    planStartedAt,
    activePlanDayNumber,
    activePlanDaySetOn,
    today
  );
  if (!activeDay) return 'No plan';
  if (activeDay.day.isRest) return 'Rest day';
  return activeDay.day.title.length > 14
    ? `${activeDay.day.title.slice(0, 12)}…`
    : activeDay.day.title;
}

type Props = {
  activePlanId: string | null;
  planStartedAt: string | null;
  activePlanDayNumber: number | null;
  activePlanDaySetOn: string | null;
};

export function DashboardStatsRow({
  activePlanId,
  planStartedAt,
  activePlanDayNumber,
  activePlanDaySetOn,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [totalCal, setTotalCal] = useState(0);
  const [calorieTarget, setCalorieTarget] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [daysThisWeek, setDaysThisWeek] = useState(0);

  const today = useLocalTodayKey();
  const workoutLabel = getWorkoutLabel(
    activePlanId,
    planStartedAt,
    activePlanDayNumber,
    activePlanDaySetOn,
    today
  );
  const calPct =
    calorieTarget && calorieTarget > 0
      ? Math.min(100, Math.round((totalCal / calorieTarget) * 100))
      : 0;
  const weekGoal = 5;
  const weekPct = Math.min(100, Math.round((daysThisWeek / weekGoal) * 100));
  const weekCircumference = 2 * Math.PI * 18;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/nutrition?date=${encodeURIComponent(today)}`).then((r) =>
        r.ok ? r.json() : Promise.resolve({ entries: [] })
      ),
      fetch('/api/user/me').then((r) => (r.ok ? r.json() : Promise.resolve({}))),
      fetch('/api/workout/log?limit=100').then((r) =>
        r.ok ? r.json() : Promise.resolve({ logs: [] })
      ),
    ])
      .then(([nutritionData, userData, workoutData]) => {
        if (cancelled) return;
        const entries = nutritionData.entries ?? [];
        setTotalCal(entries.reduce((s: number, e: { calories?: number }) => s + (e.calories ?? 0), 0));
        setCalorieTarget(
          typeof userData.calorieTarget === 'number' ? userData.calorieTarget : null
        );
        const dates = new Set<string>();
        for (const log of workoutData.logs ?? []) {
          if (log.loggedAt) dates.add(toLocalDateOnly(log.loggedAt));
        }
        const plan = WORKOUT_PLANS.find((p) => p.id === activePlanId) ?? null;
        setStreak(computeWorkoutStreak(dates, plan, planStartedAt));
        setDaysThisWeek(countDaysThisWeek(dates));
      })
      .catch(() => {
        if (!cancelled) {
          setTotalCal(0);
          setStreak(0);
          setDaysThisWeek(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [today, activePlanId, planStartedAt]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-card border border-border rounded-card p-3 sm:p-4 animate-pulse">
            <div className="h-3 w-12 bg-bg3 rounded mb-2" />
            <div className="h-5 w-16 bg-bg3 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <Link
        href="/nutrition"
        className="bg-card border border-border rounded-card p-3 sm:p-4 hover:border-accent/40 transition-colors"
      >
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1">Calories</p>
        <p className="font-mono text-base sm:text-lg text-accent3 leading-tight">
          {totalCal}
          {calorieTarget != null && (
            <span className="text-muted text-xs font-sans"> / {calorieTarget}</span>
          )}
        </p>
        {calorieTarget != null && calorieTarget > 0 && (
          <div className="mt-2 h-1 rounded-full bg-bg3 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent3 transition-all"
              style={{ width: `${calPct}%` }}
            />
          </div>
        )}
      </Link>

      <Link
        href="/workouts"
        className="bg-card border border-border rounded-card p-3 sm:p-4 hover:border-accent/40 transition-colors"
      >
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1">Streak</p>
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40" aria-hidden>
              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="3" className="text-bg3" />
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="text-accent3"
                strokeDasharray={weekCircumference}
                strokeDashoffset={weekCircumference * (1 - weekPct / 100)}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-accent3">
              {daysThisWeek}
            </span>
          </div>
          <div>
            <p className="font-mono text-base sm:text-lg text-accent3 leading-tight">
              {streak}
              <span className="text-muted text-xs font-sans"> day{streak !== 1 ? 's' : ''}</span>
            </p>
            <p className="font-sans text-[10px] sm:text-xs text-muted">
              {daysThisWeek}/{weekGoal} this week
            </p>
          </div>
        </div>
      </Link>

      <Link
        href="/workouts"
        className="bg-card border border-border rounded-card p-3 sm:p-4 hover:border-accent/40 transition-colors"
      >
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1">Today</p>
        <p className="font-sans text-sm sm:text-base font-medium text-text leading-tight line-clamp-2">
          {workoutLabel}
        </p>
      </Link>
    </div>
  );
}
