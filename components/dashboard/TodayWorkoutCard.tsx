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
    <Link
      href="/workouts"
      className="bg-card border border-border rounded-card p-6 block hover:border-accent/50 transition-colors"
    >
      <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
        Today&apos;s Workout
      </h2>
      <p className="font-sans font-medium text-text">
        {plan.name} — Day {day.dayNumber}: {day.title}
      </p>
      <p className="font-sans text-sm text-muted mt-1">
        {day.exercises.length} exercises
      </p>
      <span className="font-sans text-sm text-accent hover:underline mt-2 inline-block">
        View workout →
      </span>
    </Link>
  );
}
