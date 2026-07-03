'use client';

import Link from 'next/link';
import { WORKOUT_PLANS, getActivePlanDay } from '@/lib/workout-plans';

type Props = {
  activePlanId: string | null;
  planStartedAt: string | null;
  activePlanDayNumber: number | null;
};

export function TodayWorkoutCard({
  activePlanId,
  planStartedAt,
  activePlanDayNumber,
}: Props) {
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

  const plan = WORKOUT_PLANS.find((p) => p.id === activePlanId);
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

  const activeDay = getActivePlanDay(plan, planStartedAt, activePlanDayNumber);
  if (!activeDay) {
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

  const { day } = activeDay;

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
