'use client';

import {
  RIDE_COURSES,
  difficultyLabel,
  type RideCourse,
} from '@/lib/ride/courses';

export function CoursePicker({
  selectedId,
  onSelect,
  disabled,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <section className="rounded-card border border-border bg-card p-4 md:p-6 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-accent uppercase tracking-wide">
            Hill course
          </h2>
          <p className="font-sans text-xs text-muted mt-1">
            Auto-drives trainer SIM grade from the profile as you roll. Pick one or ride free.
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
        {RIDE_COURSES.map((c) => (
          <CourseCard
            key={c.id}
            course={c}
            selected={selectedId === c.id}
            disabled={disabled}
            onClick={() => onSelect(selectedId === c.id ? null : c.id)}
          />
        ))}
      </div>
    </section>
  );
}

function CourseCard({
  course,
  selected,
  disabled,
  onClick,
}: {
  course: RideCourse;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
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
          {course.name}
        </p>
        <span className="font-mono text-[10px] uppercase text-muted">
          {difficultyLabel(course.difficulty)}
        </span>
      </div>
      <p className="font-sans text-xs text-muted mt-1">{course.blurb}</p>
      <p className="font-mono text-[10px] text-muted mt-2">
        {(course.lengthMeters / 1000).toFixed(1)} km · ~{course.elevationGainM} m gain
      </p>
    </button>
  );
}
