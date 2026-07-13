'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  WORKOUT_PLANS,
  getActivePlanDay,
  getPlanDayByNumber,
} from '@/lib/workout-plans';
import { toLocalDateOnly } from '@/lib/local-date';
import { useLocalTodayKey } from '@/lib/use-local-today-key';

type Props = {
  activePlanId: string | null;
  planStartedAt: string | null;
  activePlanDayNumber: number | null;
  activePlanDaySetOn: string | null;
};

type LogRow = {
  planId?: string | null;
  dayNumber?: number | null;
  loggedAt?: string | null;
};

type DisplayState = {
  dayNumber: number;
  completed: boolean;
  loaded: boolean;
};

export function TodayWorkoutCard({
  activePlanId,
  planStartedAt,
  activePlanDayNumber,
  activePlanDaySetOn,
}: Props) {
  const todayKey = useLocalTodayKey();
  const [display, setDisplay] = useState<DisplayState>({
    dayNumber: 0,
    completed: false,
    loaded: false,
  });

  const plan =
    activePlanId && planStartedAt
      ? WORKOUT_PLANS.find((p) => p.id === activePlanId) ?? null
      : null;

  const scheduledDay =
    plan && planStartedAt
      ? getActivePlanDay(
          plan,
          planStartedAt,
          activePlanDayNumber,
          activePlanDaySetOn,
          todayKey
        )
      : null;

  const scheduledDayNumber = scheduledDay?.dayNumber ?? null;

  const loadDisplay = useCallback(() => {
    if (!activePlanId || !plan || scheduledDayNumber == null) {
      setDisplay({ dayNumber: 0, completed: false, loaded: true });
      return () => {};
    }

    let cancelled = false;
    setDisplay((prev) => ({ ...prev, loaded: false }));

    fetch('/api/workout/log?limit=30')
      .then((res) => (res.ok ? res.json() : { logs: [] }))
      .then((data: { logs?: LogRow[] }) => {
        if (cancelled) return;
        // Prefer the plan day actually logged today (e.g. Day 5) over a same-day
        // "next up" override that still points at Day 6.
        const todaysLog = (data.logs ?? []).find(
          (log) =>
            log.loggedAt &&
            toLocalDateOnly(log.loggedAt) === todayKey &&
            log.planId === activePlanId &&
            typeof log.dayNumber === 'number'
        );

        if (todaysLog && typeof todaysLog.dayNumber === 'number') {
          const logged = getPlanDayByNumber(plan, todaysLog.dayNumber);
          if (logged && !logged.day.isRest) {
            setDisplay({
              dayNumber: logged.dayNumber,
              completed: true,
              loaded: true,
            });
            // Clear a stale same-day jump-ahead so Workouts/Insight agree.
            if (
              activePlanDaySetOn === todayKey &&
              activePlanDayNumber != null &&
              activePlanDayNumber !== logged.dayNumber
            ) {
              void fetch('/api/user/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  activePlanDayNumber: logged.dayNumber,
                  activePlanDaySetOn: todayKey,
                }),
              });
            }
            return;
          }
        }

        setDisplay({
          dayNumber: scheduledDayNumber,
          completed: false,
          loaded: true,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setDisplay({
            dayNumber: scheduledDayNumber,
            completed: false,
            loaded: true,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activePlanId,
    plan,
    scheduledDayNumber,
    todayKey,
    activePlanDayNumber,
    activePlanDaySetOn,
  ]);

  useEffect(() => {
    return loadDisplay();
  }, [loadDisplay]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') loadDisplay();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [loadDisplay]);

  if (!activePlanId || !planStartedAt) {
    return (
      <div className="bg-card border border-border rounded-card p-5 sm:p-6">
        <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
          Today&apos;s Workout
        </h2>
        <p className="font-sans text-muted text-sm mb-4">No workout plan selected.</p>
        <Link
          href="/workouts"
          className="inline-block bg-accent text-black font-sans font-bold text-sm uppercase px-4 py-2.5 rounded-card hover:shadow-glow"
        >
          Pick a plan
        </Link>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="bg-card border border-border rounded-card p-5 sm:p-6">
        <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
          Today&apos;s Workout
        </h2>
        <p className="font-sans text-muted text-sm mb-4">Plan not found.</p>
        <Link
          href="/workouts"
          className="inline-block bg-bg3 border border-border text-text font-sans font-bold text-sm uppercase px-4 py-2.5 rounded-card hover:border-accent"
        >
          Browse plans
        </Link>
      </div>
    );
  }

  if (!scheduledDay && !display.loaded) {
    return (
      <div className="bg-card border border-border rounded-card p-5 sm:p-6 animate-pulse">
        <div className="h-4 w-28 bg-bg3 rounded mb-3" />
        <div className="h-5 w-48 bg-bg3 rounded mb-3" />
        <div className="h-10 w-32 bg-bg3 rounded" />
      </div>
    );
  }

  if (!scheduledDay) {
    return (
      <div className="bg-card border border-border rounded-card p-5 sm:p-6">
        <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
          Today&apos;s Workout
        </h2>
        <p className="font-sans text-muted text-sm mb-4">Invalid start date.</p>
        <Link
          href="/workouts"
          className="inline-block bg-bg3 border border-border text-text font-sans font-bold text-sm uppercase px-4 py-2.5 rounded-card hover:border-accent"
        >
          Go to Workouts
        </Link>
      </div>
    );
  }

  const resolved =
    display.loaded && display.dayNumber > 0
      ? getPlanDayByNumber(plan, display.dayNumber)
      : { day: scheduledDay.day, dayNumber: scheduledDay.dayNumber };
  if (!resolved) {
    return null;
  }

  const { day } = resolved;
  const completed = display.loaded && display.completed;

  if (day.isRest) {
    return (
      <div className="bg-card border border-border rounded-card p-5 sm:p-6">
        <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
          Today&apos;s Workout
        </h2>
        <p className="font-sans font-medium text-text mb-1">
          {plan.name} — Day {day.dayNumber}
        </p>
        <p className="font-sans text-sm text-muted mb-4">Rest day. Recovery time.</p>
        <Link
          href="/workouts"
          className="inline-block bg-bg3 border border-border text-text font-sans font-bold text-sm uppercase px-4 py-2.5 rounded-card hover:border-accent"
        >
          View plan
        </Link>
      </div>
    );
  }

  const ctaLabel = plan.interactive ? 'Start workout' : 'Mark done / View plan';

  if (completed) {
    return (
      <div className="bg-card border border-border rounded-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="font-display text-lg text-muted uppercase tracking-wide">
            Today&apos;s Workout
          </h2>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-accent3 border-b border-accent3/70 pb-0.5">
            Completed
          </span>
        </div>
        <p className="font-sans font-medium text-text mb-2">
          {plan.name} — Day {day.dayNumber}: {day.title}
        </p>
        <p className="font-sans text-sm text-muted mb-4">
          Session logged. Next training day unlocks tomorrow.
        </p>
        <Link
          href="/workouts"
          className="inline-block bg-bg3 border border-border text-text font-sans font-bold text-sm uppercase px-4 py-2.5 rounded-card hover:border-accent"
        >
          View plan
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-card p-5 sm:p-6">
      <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
        Today&apos;s Workout
      </h2>
      <p className="font-sans font-medium text-text mb-3">
        {plan.name} — Day {day.dayNumber}: {day.title}
      </p>
      {plan.interactive ? (
        <p className="font-sans text-sm text-muted mb-4">
          Interactive mode with set tracking and rest timer.
        </p>
      ) : (
        <div className="space-y-1.5 mb-4 max-h-40 overflow-y-auto">
          {day.exercises.map((ex, i) => (
            <div
              key={i}
              className="flex justify-between gap-4 font-sans text-sm text-text"
            >
              <span className="truncate">{ex.name}</span>
              <span className="text-muted shrink-0">
                {ex.sets} × {ex.reps}
              </span>
            </div>
          ))}
        </div>
      )}
      <Link
        href="/workouts"
        className={`inline-block font-sans font-bold text-sm uppercase px-5 py-2.5 rounded-card ${
          plan.interactive
            ? 'bg-accent3 text-black hover:shadow-glow-accent3'
            : 'bg-accent text-black hover:shadow-glow'
        }`}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
