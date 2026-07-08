'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WORKOUT_PLANS } from '@/lib/workout-plans';
import { computeWorkoutStreak, countDaysThisWeek } from '@/lib/streak';

function toLocalDateOnly(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function WeeklyStreakCard() {
  const [streak, setStreak] = useState<number | null>(null);
  const [daysThisWeek, setDaysThisWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/workout/log?limit=100').then((res) => (res.ok ? res.json() : { logs: [] })),
      fetch('/api/user/me').then((res) => (res.ok ? res.json() : {})),
    ])
      .then(([logData, userData]) => {
        if (cancelled) return;
        const logs = (logData as { logs?: { loggedAt?: string }[] }).logs ?? [];
        const user = userData as { activePlanId?: string | null; planStartedAt?: string | null };
        const dates = new Set<string>();
        for (const log of logs) {
          if (log.loggedAt) dates.add(toLocalDateOnly(log.loggedAt));
        }
        const plan = WORKOUT_PLANS.find((p) => p.id === user.activePlanId) ?? null;
        const planStartedAt =
          typeof user.planStartedAt === 'string' ? user.planStartedAt.slice(0, 10) : null;
        setStreak(computeWorkoutStreak(dates, plan, planStartedAt));
        setDaysThisWeek(countDaysThisWeek(dates));
      })
      .catch(() => {
        if (!cancelled) setStreak(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-card p-6">
        <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
          Weekly streak
        </h2>
        <p className="font-mono text-accent3">…</p>
      </div>
    );
  }

  const streakNum = streak ?? 0;
  const weekNum = daysThisWeek ?? 0;

  return (
    <div className="bg-card border border-border rounded-card p-6">
      <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
        Weekly streak
      </h2>
      <p className="font-mono text-accent3">
        {streakNum} day{streakNum !== 1 ? 's' : ''} streak
      </p>
      <p className="font-sans text-sm text-muted mt-1">
        {weekNum} day{weekNum !== 1 ? 's' : ''} this week
      </p>
      <Link
        href="/workouts"
        className="font-sans text-sm text-accent hover:underline mt-2 inline-block"
      >
        Log workout →
      </Link>
    </div>
  );
}
