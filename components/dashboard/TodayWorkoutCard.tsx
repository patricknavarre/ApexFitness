'use client';

import Link from 'next/link';
import { WORKOUT_PLANS, getTodaysDay } from '@/lib/workout-plans';

type Props = {
  activePlanId: string | null;
  planStartedAt: string | null;
};

export function TodayWorkoutCard({ activePlanId, planStartedAt }: Props) {
  if (!activePlanId || !planStartedAt) {
    return (
      <div className="bg-card border border-border rounded-card p-6">
        <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
          Today&apos;s Workout
        </h2>
        <p className="font-sans text-muted text-sm mb-3">No workout plan selected.</p>
        <Link
          href="/workouts"
          className="font-sans text-sm text-accent hover:underline inline-block"
        >
          Browse workout plans →
        </Link>
      </div>
    );
  }

  const plan = WORKOUT_PLANS.find((p) => p.id === activePlanId);
  if (!plan) {
    return (
      <div className="bg-card border border-border rounded-card p-6">
        <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
          Today&apos;s Workout
        </h2>
        <p className="font-sans text-muted text-sm mb-3">Plan not found.</p>
        <Link
          href="/workouts"
          className="font-sans text-sm text-accent hover:underline inline-block"
        >
          Browse workout plans →
        </Link>
      </div>
    );
  }

  const todays = getTodaysDay(plan, planStartedAt);
  if (!todays) {
    return (
      <div className="bg-card border border-border rounded-card p-6">
        <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
          Today&apos;s Workout
        </h2>
        <p className="font-sans text-muted text-sm mb-3">Invalid start date.</p>
        <Link
          href="/workouts"
          className="font-sans text-sm text-accent hover:underline inline-block"
        >
          Go to Workouts →
        </Link>
      </div>
    );
  }

  const { day } = todays;
  if (day.isRest) {
    return (
      <div className="bg-card border border-border rounded-card p-6">
        <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
          Today&apos;s Workout
        </h2>
        <p className="font-sans text-muted text-sm mb-3">
          Day {day.dayNumber} — Rest day. No workout scheduled.
        </p>
        <Link
          href="/workouts"
          className="font-sans text-sm text-accent hover:underline inline-block"
        >
          View plan →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-card p-6">
      <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
        Today&apos;s Workout
      </h2>
      <p className="font-sans font-medium text-text mb-3">
        {plan.name} — Day {day.dayNumber}: {day.title}
      </p>
      <div className="space-y-2 mb-4">
        {day.exercises.map((ex, i) => (
          <div
            key={i}
            className="flex justify-between gap-4 font-sans text-sm text-text"
          >
            <span>{ex.name}</span>
            <span className="text-muted shrink-0">
              {ex.sets} × {ex.reps}
            </span>
          </div>
        ))}
      </div>
      <Link
        href="/workouts"
        className="font-sans text-sm text-accent hover:underline inline-block"
      >
        Mark done / View full plan →
      </Link>
    </div>
  );
}
