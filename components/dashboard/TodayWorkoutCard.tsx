'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  WORKOUT_PLANS,
  getActivePlanDay,
  getPlanDayByNumber,
} from '@/lib/workout-plans';
import { todayLocal, toLocalDateOnly } from '@/lib/local-date';
import { useLocalTodayKey } from '@/lib/use-local-today-key';
import { syncActivePlanToDay } from '@/lib/sync-active-plan';
import {
  evaluateRestDayMacros,
  type RestMacroStatus,
} from '@/lib/rest-day-macros';

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
  isRestDay?: boolean;
};

type DisplayState = {
  planId: string | null;
  dayNumber: number;
  completed: boolean;
  restCredited: boolean;
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
    planId: null,
    dayNumber: 0,
    completed: false,
    restCredited: false,
    loaded: false,
  });
  const [restMacro, setRestMacro] = useState<RestMacroStatus | null>(null);
  const [restLoading, setRestLoading] = useState(false);
  const [creditingRest, setCreditingRest] = useState(false);

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
    let cancelled = false;
    setDisplay((prev) => ({ ...prev, loaded: false }));

    fetch('/api/workout/log?limit=30')
      .then((res) => (res.ok ? res.json() : { logs: [] }))
      .then((data: { logs?: LogRow[] }) => {
        if (cancelled) return;
        const todayLogs = (data.logs ?? []).filter(
          (log) => log.loggedAt && toLocalDateOnly(log.loggedAt) === todayKey
        );
        const restCredited = todayLogs.some((log) => log.isRestDay);

        const matchingPlanLog = todayLogs.find(
          (log) =>
            log.planId === activePlanId &&
            typeof log.dayNumber === 'number' &&
            !log.isRestDay
        );
        const anyPlanLog = todayLogs.find(
          (log) =>
            !!log.planId &&
            log.planId !== 'youth-sd' &&
            typeof log.dayNumber === 'number' &&
            !log.isRestDay
        );
        const todaysPlanLog = matchingPlanLog ?? anyPlanLog;

        if (todaysPlanLog?.planId && typeof todaysPlanLog.dayNumber === 'number') {
          const logPlan =
            WORKOUT_PLANS.find((p) => p.id === todaysPlanLog.planId) ?? null;
          const logged = logPlan
            ? getPlanDayByNumber(logPlan, todaysPlanLog.dayNumber)
            : null;
          if (logged && !logged.day.isRest) {
            setDisplay({
              planId: todaysPlanLog.planId,
              dayNumber: logged.dayNumber,
              completed: true,
              restCredited: false,
              loaded: true,
            });
            if (
              todaysPlanLog.planId !== activePlanId ||
              scheduledDayNumber !== logged.dayNumber
            ) {
              void syncActivePlanToDay(
                todaysPlanLog.planId,
                logged.dayNumber,
                {
                  activePlanId,
                  planStartedAt,
                  activePlanDayNumber,
                  activePlanDaySetOn,
                },
                todayKey
              ).catch(() => {
                // display already shows the completed log
              });
            }
            return;
          }
        }

        if (scheduledDayNumber == null || !activePlanId) {
          setDisplay({
            planId: activePlanId,
            dayNumber: 0,
            completed: false,
            restCredited,
            loaded: true,
          });
          return;
        }

        setDisplay({
          planId: activePlanId,
          dayNumber: scheduledDayNumber,
          completed: false,
          restCredited,
          loaded: true,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setDisplay({
            planId: activePlanId,
            dayNumber: scheduledDayNumber ?? 0,
            completed: false,
            restCredited: false,
            loaded: true,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activePlanId,
    planStartedAt,
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

  const loadRestMacros = useCallback(() => {
    let cancelled = false;
    setRestLoading(true);
    const date = todayLocal();
    Promise.all([
      fetch(`/api/nutrition?date=${date}`).then((r) => (r.ok ? r.json() : { entries: [] })),
      fetch('/api/user/me').then((r) =>
        r.ok
          ? r.json()
          : Promise.resolve({
              calorieTarget: null as number | null,
              proteinTarget: null as number | null,
            })
      ),
    ])
      .then(
        ([nutrition, user]: [
          { entries?: { calories?: number; proteinG?: number }[] },
          { calorieTarget?: number | null; proteinTarget?: number | null },
        ]) => {
        if (cancelled) return;
        const entries = nutrition.entries ?? [];
        const calories = entries.reduce((s, e) => s + (Number(e.calories) || 0), 0);
        const proteinG = entries.reduce((s, e) => s + (Number(e.proteinG) || 0), 0);
        setRestMacro(
          evaluateRestDayMacros(
            { calories, proteinG },
            {
              calorieTarget: user.calorieTarget ?? null,
              proteinTarget: user.proteinTarget ?? null,
            }
          )
        );
      }
      )
      .catch(() => {
        if (!cancelled) setRestMacro(null);
      })
      .finally(() => {
        if (!cancelled) setRestLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!scheduledDay?.day.isRest) return;
    return loadRestMacros();
  }, [scheduledDay?.day.isRest, loadRestMacros, todayKey]);

  async function creditRestDay() {
    setCreditingRest(true);
    try {
      const res = await fetch('/api/workout/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restDay: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not credit rest day');
      toast.success('Rest day credited to your streak');
      setDisplay((prev) => ({ ...prev, restCredited: true }));
      loadDisplay();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not credit rest day');
    } finally {
      setCreditingRest(false);
    }
  }

  function Shell({
    children,
    badge,
  }: {
    children: ReactNode;
    badge?: string;
  }) {
    return (
      <div className="bg-card border border-border rounded-card overflow-hidden">
        <div className="px-5 sm:px-6 py-3 border-b border-border bg-bg3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-0.5">
                Today&apos;s mission
              </p>
              <h2 className="font-display text-xl text-tan uppercase tracking-wide">
                Today&apos;s Workout
              </h2>
            </div>
            {badge ? (
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-accent border-b border-accent/70 pb-0.5">
                {badge}
              </span>
            ) : null}
          </div>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    );
  }

  if (!activePlanId || !planStartedAt) {
    return (
      <Shell>
        <p className="font-sans text-muted text-sm mb-4">No workout plan selected.</p>
        <Link
          href="/workouts"
          className="od-cta inline-flex w-full min-h-[44px] items-center justify-center bg-accent text-black font-sans font-bold text-sm uppercase px-4 py-2.5 rounded-card hover:shadow-glow"
        >
          Pick a plan
        </Link>
      </Shell>
    );
  }

  if (!plan && !(display.loaded && display.planId)) {
    return (
      <Shell>
        <p className="font-sans text-muted text-sm mb-4">Plan not found.</p>
        <Link
          href="/workouts"
          className="od-cta inline-flex w-full min-h-[44px] items-center justify-center border border-border text-tan font-sans font-bold text-sm uppercase px-4 py-2.5 rounded-card hover:border-accent"
        >
          Browse plans
        </Link>
      </Shell>
    );
  }

  if (!display.loaded && !scheduledDay) {
    return (
      <div className="bg-card border border-border rounded-card p-5 sm:p-6 animate-pulse">
        <div className="h-4 w-28 bg-bg3 rounded mb-3" />
        <div className="h-5 w-48 bg-bg3 rounded mb-3" />
        <div className="h-10 w-32 bg-bg3 rounded" />
      </div>
    );
  }

  const resolvedPlanId = display.planId ?? activePlanId;
  const resolvedPlan =
    WORKOUT_PLANS.find((p) => p.id === resolvedPlanId) ?? plan;

  const resolved =
    display.loaded && display.dayNumber > 0 && resolvedPlan
      ? getPlanDayByNumber(resolvedPlan, display.dayNumber)
      : scheduledDay
        ? { day: scheduledDay.day, dayNumber: scheduledDay.dayNumber }
        : null;

  if (!resolved || !resolvedPlan) {
    return (
      <Shell>
        <p className="font-sans text-muted text-sm mb-4">Invalid start date.</p>
        <Link
          href="/workouts"
          className="od-cta inline-flex w-full min-h-[44px] items-center justify-center border border-border text-tan font-sans font-bold text-sm uppercase px-4 py-2.5 rounded-card hover:border-accent"
        >
          Go to Workouts
        </Link>
      </Shell>
    );
  }

  const { day } = resolved;
  const completed = display.loaded && display.completed;

  if (day.isRest) {
    if (display.restCredited) {
      return (
        <Shell badge="Rest credited">
          <p className="font-sans font-medium text-text mb-2">
            {resolvedPlan.name} — Day {day.dayNumber}
          </p>
          <p className="font-sans text-sm text-muted mb-4">
            Recovery day logged. Streak stays strong.
          </p>
          <Link
            href="/workouts"
            className="od-cta inline-flex w-full min-h-[44px] items-center justify-center border border-border text-tan font-sans font-bold text-sm uppercase px-4 py-2.5 rounded-card hover:border-accent"
          >
            View plan
          </Link>
        </Shell>
      );
    }

    return (
      <Shell>
        <p className="font-sans font-medium text-text mb-1">
          {resolvedPlan.name} — Day {day.dayNumber}
        </p>
        <p className="font-sans text-sm text-muted mb-3">
          Rest day. Hit calories &amp; protein to credit it toward your streak.
        </p>
        <p className="font-sans text-xs text-muted mb-4">
          {restLoading
            ? 'Checking macros…'
            : restMacro?.message ?? 'Loading nutrition status…'}
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={creditingRest || restLoading || !restMacro?.ready}
            onClick={() => void creditRestDay()}
            className="od-cta w-full min-h-[44px] bg-accent text-black font-sans font-bold text-sm uppercase px-4 py-2.5 rounded-card hover:shadow-glow disabled:opacity-40"
          >
            {creditingRest ? 'Saving…' : 'Rest day taken'}
          </button>
          <Link
            href="/nutrition"
            className="od-cta inline-flex w-full min-h-[44px] items-center justify-center border border-border text-tan font-sans font-bold text-sm uppercase px-4 py-2.5 rounded-card hover:border-accent"
          >
            {restMacro?.ready ? 'View nutrition' : 'Log food'}
          </Link>
        </div>
      </Shell>
    );
  }

  const ctaLabel = resolvedPlan.interactive ? 'Start workout' : 'Mark done / View plan';

  if (completed) {
    return (
      <Shell badge="Completed">
        <p className="font-sans font-medium text-text mb-2">
          {resolvedPlan.name} — Day {day.dayNumber}: {day.title}
        </p>
        <p className="font-sans text-sm text-muted mb-4">
          Session logged. Next training day unlocks tomorrow.
        </p>
        <Link
          href="/workouts"
          className="od-cta inline-flex w-full min-h-[44px] items-center justify-center border border-border text-tan font-sans font-bold text-sm uppercase px-4 py-2.5 rounded-card hover:border-accent"
        >
          View plan
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="font-sans font-medium text-text mb-3">
        {resolvedPlan.name} — Day {day.dayNumber}: {day.title}
      </p>
      {resolvedPlan.interactive ? (
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
        href={resolvedPlan.interactive ? '/workouts?start=1' : '/workouts'}
        className="od-cta inline-flex w-full min-h-[44px] items-center justify-center bg-accent text-black font-sans font-bold text-sm uppercase px-5 py-2.5 rounded-card hover:shadow-glow"
      >
        {ctaLabel}
      </Link>
    </Shell>
  );
}
