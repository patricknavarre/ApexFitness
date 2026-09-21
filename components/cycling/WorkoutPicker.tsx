'use client';

import {
  RIDE_WORKOUTS,
  workoutTotalSeconds,
  type RideWorkout,
} from '@/lib/ride/workouts';

export function WorkoutPicker({
  selectedId,
  onSelect,
  disabled,
  ftp,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
  ftp: number;
}) {
  return (
    <section className="rounded-card border border-border bg-card p-4 md:p-6 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-accent uppercase tracking-wide">
            Training session
          </h2>
          <p className="font-sans text-xs text-muted mt-1">
            Structured ERG intervals from your FTP ({ftp} W). Clears a hill course if both
            selected.
          </p>
        </div>
        {selectedId && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(null)}
            className="font-sans text-xs text-muted hover:text-text shrink-0"
          >
            Clear
          </button>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {RIDE_WORKOUTS.map((w) => (
          <WorkoutCard
            key={w.id}
            workout={w}
            selected={selectedId === w.id}
            disabled={disabled}
            onClick={() => onSelect(selectedId === w.id ? null : w.id)}
          />
        ))}
      </div>
    </section>
  );
}

function WorkoutCard({
  workout,
  selected,
  disabled,
  onClick,
}: {
  workout: RideWorkout;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const mins = Math.round(workoutTotalSeconds(workout) / 60);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`text-left rounded-card border px-3 py-3 transition-colors disabled:opacity-50 ${
        selected
          ? 'border-accent bg-accent/10'
          : 'border-border bg-bg2/40 hover:border-accent/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`font-sans text-sm font-semibold ${selected ? 'text-accent' : 'text-text'}`}>
          {workout.name}
        </p>
        <span className="font-mono text-[10px] uppercase text-muted">
          {workout.difficulty}
        </span>
      </div>
      <p className="font-sans text-xs text-muted mt-1">{workout.blurb}</p>
      <p className="font-mono text-[10px] text-muted mt-2">
        ~{mins} min · {workout.segments.length} blocks · {workout.tags.join(' · ')}
      </p>
    </button>
  );
}
