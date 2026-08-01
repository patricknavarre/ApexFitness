'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WORKOUT_PLANS } from '@/lib/workout-plans';
import { computeWorkoutStreak, countDaysThisWeek } from '@/lib/streak';
import { toLocalDateOnly } from '@/lib/local-date';
import {
  buildMilestones,
  getCurrentWeekDayKeys,
  getNextGoal,
  type Milestone,
  type NextGoal,
} from '@/lib/milestones';

type Props = {
  activePlanId: string | null;
  planStartedAt: string | null;
  variant?: 'card' | 'full';
};

function pct(progress: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((progress / target) * 100));
}

export function MomentumCard({ activePlanId, planStartedAt, variant = 'card' }: Props) {
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [daysThisWeek, setDaysThisWeek] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set());
  const [photoCount, setPhotoCount] = useState(0);
  const [weightDeltaLbs, setWeightDeltaLbs] = useState<number | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [nextGoal, setNextGoal] = useState<NextGoal | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/workout/log?limit=100').then((r) =>
        r.ok ? r.json() : Promise.resolve({ logs: [] })
      ),
      fetch('/api/progress').then((r) =>
        r.ok ? r.json() : Promise.resolve({ photos: [] })
      ),
    ])
      .then(([workoutData, progressData]) => {
        if (cancelled) return;
        const logs = (workoutData.logs ?? []) as {
          loggedAt?: string | null;
          planId?: string | null;
          dayNumber?: number | null;
          cardioExercise?: string | null;
        }[];
        const dates = new Set<string>();
        for (const log of logs) {
          if (!log.loggedAt) continue;
          dates.add(toLocalDateOnly(log.loggedAt));
        }
        const workoutCount = dates.size;

        const plan = WORKOUT_PLANS.find((p) => p.id === activePlanId) ?? null;
        const streakVal = computeWorkoutStreak(dates, plan, planStartedAt);
        const weekVal = countDaysThisWeek(dates);

        const photos = (progressData.photos ?? []) as {
          takenAt?: string;
          weightKg?: number | null;
        }[];
        const sorted = [...photos].sort(
          (a, b) =>
            new Date(a.takenAt ?? 0).getTime() - new Date(b.takenAt ?? 0).getTime()
        );
        let delta: number | null = null;
        if (sorted.length >= 2) {
          const first = sorted[0].weightKg;
          const latest = sorted[sorted.length - 1].weightKg;
          if (
            typeof first === 'number' &&
            first > 0 &&
            typeof latest === 'number' &&
            latest > 0
          ) {
            delta = Math.round((latest - first) * 2.205 * 10) / 10;
          }
        }

        const ms = buildMilestones({
          loggedDates: dates,
          streak: streakVal,
          daysThisWeek: weekVal,
          totalWorkouts: workoutCount,
          photoCount: photos.length,
          weightDeltaLbs: delta,
        });

        setLoggedDates(dates);
        setStreak(streakVal);
        setDaysThisWeek(weekVal);
        setTotalWorkouts(workoutCount);
        setPhotoCount(photos.length);
        setWeightDeltaLbs(delta);
        setMilestones(ms);
        setNextGoal(getNextGoal(ms, streakVal, weekVal));
      })
      .catch(() => {
        if (!cancelled) {
          setMilestones([]);
          setNextGoal(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activePlanId, planStartedAt]);

  const weekDays = getCurrentWeekDayKeys();
  const isFull = variant === 'full';

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-card p-5 sm:p-6 animate-pulse">
        <div className="h-4 w-28 bg-bg3 rounded mb-4" />
        <div className="h-16 bg-bg3 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h2 className="font-display text-lg text-muted uppercase tracking-wide">Momentum</h2>
        {!isFull && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent3">
            {streak} day streak
          </p>
        )}
      </div>

      {isFull && (
        <div className="mb-5">
          <ProgressHeroStats
            streak={streak}
            daysThisWeek={daysThisWeek}
            totalWorkouts={totalWorkouts}
          />
        </div>
      )}

      {/* Week strip */}
      <div className="flex justify-between gap-1 mb-5">
        {weekDays.map(({ label, key }) => {
          const hit = loggedDates.has(key);
          return (
            <div key={key} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="font-mono text-[9px] uppercase text-muted">{label}</span>
              <span
                className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                  hit
                    ? 'bg-accent3 shadow-[0_0_8px_rgba(0,210,255,0.55)] scale-110'
                    : 'bg-bg3 border border-border'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Next goal */}
      {nextGoal && (
        <div className="mb-5">
          <p className="font-sans text-sm text-text mb-2">{nextGoal.label}</p>
          <div className="h-1.5 rounded-full bg-bg3 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent3 transition-all duration-500 ease-out"
              style={{ width: `${pct(nextGoal.progress, nextGoal.target)}%` }}
            />
          </div>
          <p className="font-mono text-[10px] text-muted mt-1.5">
            {nextGoal.progress}/{nextGoal.target}
          </p>
        </div>
      )}

      {/* Milestone chips / grid */}
      {isFull ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {milestones.map((m) => (
            <div
              key={m.id}
              className={`rounded-card border px-3 py-3 transition-colors ${
                m.earned
                  ? 'border-accent3/50 bg-accent3/5'
                  : 'border-border bg-bg2/40 opacity-70'
              }`}
            >
              <p
                className={`font-sans text-sm font-semibold ${
                  m.earned ? 'text-accent3' : 'text-muted'
                }`}
              >
                {m.earned ? '✓ ' : ''}
                {m.label}
              </p>
              <p className="font-sans text-xs text-muted mt-0.5">{m.description}</p>
              {!m.earned && (
                <div className="mt-2 h-1 rounded-full bg-bg3 overflow-hidden">
                  <div
                    className="h-full bg-accent3/60 transition-all duration-500"
                    style={{ width: `${pct(m.progress, m.target)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {milestones.map((m) => (
            <span
              key={m.id}
              className={`shrink-0 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wide transition-all ${
                m.earned
                  ? 'border-accent3/60 text-accent3 shadow-[0_0_10px_rgba(0,210,255,0.25)]'
                  : 'border-border text-muted'
              }`}
            >
              {m.earned ? '✓ ' : ''}
              {m.label}
            </span>
          ))}
        </div>
      )}

      {!isFull && (
        <Link
          href="/progress"
          className="mt-4 inline-block font-sans text-xs text-accent3 hover:underline"
        >
          See all progress →
        </Link>
      )}

      {isFull && (
        <p className="mt-4 font-sans text-xs text-muted">
          {totalWorkouts} session{totalWorkouts === 1 ? '' : 's'} logged
          {photoCount > 0 ? ` · ${photoCount} photo${photoCount === 1 ? '' : 's'}` : ''}
          {weightDeltaLbs != null
            ? ` · ${weightDeltaLbs > 0 ? '+' : ''}${weightDeltaLbs} lbs since first photo`
            : ''}
        </p>
      )}
    </div>
  );
}

/** Compact hero numbers for the Progress page. */
export function ProgressHeroStats({
  streak,
  daysThisWeek,
  totalWorkouts,
  weekGoal = 5,
}: {
  streak: number;
  daysThisWeek: number;
  totalWorkouts: number;
  weekGoal?: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {[
        { label: 'Streak', value: `${streak}`, suffix: 'days' },
        { label: 'This week', value: `${daysThisWeek}`, suffix: `/ ${weekGoal}` },
        { label: 'Sessions', value: `${totalWorkouts}`, suffix: 'total' },
      ].map((stat) => (
        <div
          key={stat.label}
          className="rounded-card border border-border bg-card px-3 py-3 text-center"
        >
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted mb-1">
            {stat.label}
          </p>
          <p className="font-display text-2xl sm:text-3xl text-accent3 leading-none">
            {stat.value}
          </p>
          <p className="font-sans text-[10px] text-muted mt-1">{stat.suffix}</p>
        </div>
      ))}
    </div>
  );
}
