'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WORKOUT_PLANS, type WorkoutPlan } from '@/lib/workout-plans';

function getTodaysDay(
  plan: WorkoutPlan,
  planStartedAt: string
): { day: { dayNumber: number; title: string }; dayNumber: number } | null {
  const start = new Date(planStartedAt);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 0 || plan.days.length === 0) return null;
  const dayIndex = diffDays % plan.days.length;
  const day = plan.days[dayIndex];
  return { day, dayNumber: day.dayNumber };
}

function getUniqueLogDatesInLast7Days(logs: { loggedAt: string | null }[]): number {
  const set = new Set<string>();
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    set.add(d.toISOString().slice(0, 10));
  }
  let count = 0;
  const seen = new Set<string>();
  for (const log of logs) {
    if (!log.loggedAt) continue;
    const dateStr = log.loggedAt.slice(0, 10);
    if (set.has(dateStr) && !seen.has(dateStr)) {
      seen.add(dateStr);
      count++;
    }
  }
  return count;
}

export default function DashboardPage() {
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [planStartedAt, setPlanStartedAt] = useState<string | null>(null);
  const [caloriesToday, setCaloriesToday] = useState<number | null>(null);
  const [calorieTarget, setCalorieTarget] = useState<number | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<{ loggedAt: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/user/me').then((r) => (r.ok ? r.json() : {})),
      fetch(`/api/nutrition?date=${new Date().toISOString().slice(0, 10)}`).then((r) =>
        r.ok ? r.json() : { entries: [] }
      ),
      fetch('/api/workout/log?limit=50').then((r) => (r.ok ? r.json() : { logs: [] })),
    ])
      .then(([user, nutrition, log]) => {
        if (cancelled) return;
        setActivePlanId(user.activePlanId ?? null);
        setPlanStartedAt(user.planStartedAt ?? null);
        setCalorieTarget(user.calorieTarget ?? null);
        const entries = nutrition.entries ?? [];
        const total = entries.reduce((s: number, e: { calories?: number }) => s + (e.calories ?? 0), 0);
        setCaloriesToday(total);
        setWorkoutLogs((log.logs ?? []).map((l: { loggedAt?: string }) => ({ loggedAt: l.loggedAt ?? null })));
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activePlan = activePlanId ? WORKOUT_PLANS.find((p) => p.id === activePlanId) : null;
  const todaysWorkout =
    activePlan && planStartedAt ? getTodaysDay(activePlan, planStartedAt) : null;
  const streakCount = getUniqueLogDatesInLast7Days(workoutLogs);

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="font-display text-3xl text-accent uppercase tracking-wide">
        Dashboard
      </h1>
      <div className="bg-card border border-border rounded-card p-8 text-center">
        <p className="font-sans text-muted mb-6">
          Pick a workout plan and start training—no photo required. Or try AI body analysis for
          personalized insights when you&apos;re ready.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/workouts"
            className="inline-block bg-accent text-black font-sans font-bold uppercase px-6 py-3 rounded-card hover:shadow-glow transition-shadow"
          >
            Browse workout plans
          </Link>
          <Link
            href="/analysis"
            className="inline-block bg-bg3 border border-border text-text font-sans font-bold uppercase px-6 py-3 rounded-card hover:border-accent transition-colors"
          >
            Try AI Analysis (optional)
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-card p-6 animate-pulse h-28" />
          <div className="bg-card border border-border rounded-card p-6 animate-pulse h-28" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-card p-6">
            <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
              Today&apos;s Workout
            </h2>
            {todaysWorkout ? (
              <p className="font-sans text-text mb-2">
                Day {todaysWorkout.dayNumber} — {todaysWorkout.day.title}
              </p>
              <Link
                href="/workouts"
                className="text-accent font-sans text-sm font-medium hover:underline"
              >
                View plan →
              </Link>
            ) : (
              <p className="font-sans text-muted text-sm">No workout scheduled.</p>
            )}
          </div>
          <div className="bg-card border border-border rounded-card p-6">
            <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
              Weekly streak
            </h2>
            <p className="font-mono text-accent3">{streakCount} / 7 days</p>
            <p className="font-sans text-muted text-xs mt-1">Workouts logged in the last 7 days</p>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-card p-6">
        <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
          Calories today
        </h2>
        {loading ? (
          <p className="font-sans text-muted text-sm">Loading…</p>
        ) : (
          <p className="font-mono text-accent3">
            {caloriesToday ?? 0}
            {calorieTarget != null ? ` / ${calorieTarget}` : ''} cal
          </p>
        )}
        <Link
          href="/nutrition"
          className="font-sans text-sm text-accent hover:underline mt-2 inline-block"
        >
          Log meals →
        </Link>
      </div>
    </div>
  );
}
