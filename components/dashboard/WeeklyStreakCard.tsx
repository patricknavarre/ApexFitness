'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

function toLocalDateOnly(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getStreakAndWeekCount(loggedDates: Set<string>): { streak: number; daysThisWeek: number } {
  const today = todayLocal();
  let streak = 0;
  const msPerDay = 86400000;
  let d = new Date();
  d.setHours(12, 0, 0, 0);
  for (;;) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!loggedDates.has(key)) break;
    streak++;
    d = new Date(d.getTime() - msPerDay);
  }
  let daysThisWeek = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (loggedDates.has(key)) daysThisWeek++;
  }
  return { streak, daysThisWeek };
}

export function WeeklyStreakCard() {
  const [streak, setStreak] = useState<number | null>(null);
  const [daysThisWeek, setDaysThisWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/workout/log?limit=100')
      .then((res) => (res.ok ? res.json() : { logs: [] }))
      .then((data) => {
        if (cancelled) return;
        const dates = new Set<string>();
        for (const log of data.logs ?? []) {
          if (log.loggedAt) dates.add(toLocalDateOnly(log.loggedAt));
        }
        const { streak: s, daysThisWeek: w } = getStreakAndWeekCount(dates);
        setStreak(s);
        setDaysThisWeek(w);
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
