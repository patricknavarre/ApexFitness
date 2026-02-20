'use client';

import { useState } from 'react';
import {
  WORKOUT_PLANS,
  type WorkoutPlan as WorkoutPlanType,
  type WorkoutDay,
} from '@/lib/workout-plans';

function DayCard({ day }: { day: WorkoutDay }) {
  const [open, setOpen] = useState(false);
  if (day.isRest) {
    return (
      <div className="rounded-card border border-border bg-bg2/50 px-4 py-3">
        <span className="font-sans font-medium text-muted">Day {day.dayNumber} — Rest</span>
      </div>
    );
  }
  return (
    <div className="rounded-card border border-border bg-bg2 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-bg3/50 transition-colors"
      >
        <span className="font-sans font-medium text-text">
          Day {day.dayNumber} — {day.title}
        </span>
        <span className="text-muted text-sm">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3 space-y-2">
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
      )}
    </div>
  );
}

function PlanCard({ plan }: { plan: WorkoutPlanType }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-card border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-left hover:bg-bg2/50 transition-colors"
      >
        <div>
          <h2 className="font-display text-xl text-accent uppercase tracking-wide">
            {plan.name}
          </h2>
          <p className="font-sans text-sm text-muted mt-0.5">
            {plan.goal} · {plan.daysPerWeek} days/week · {plan.repRange}
          </p>
          <span className="font-sans text-xs text-muted mt-1 inline-block">
            {plan.equipment === 'none' ? 'No gym' : plan.equipment === 'home' ? 'Home gym' : 'Full gym'}
          </span>
        </div>
        <span className="text-muted text-sm">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          <div className="grid gap-2">
            {plan.days.map((day) => (
              <DayCard key={day.dayNumber} day={day} />
            ))}
          </div>
          {(plan.progressionRules?.length ?? 0) > 0 && (
            <div>
              <h3 className="font-sans font-semibold text-text text-sm mb-1">
                Progression
              </h3>
              <ul className="font-sans text-sm text-muted space-y-0.5">
                {plan.progressionRules!.map((r, i) => (
                  <li key={i}>✓ {r}</li>
                ))}
              </ul>
            </div>
          )}
          {(plan.nutritionReminders?.length ?? 0) > 0 && (
            <div>
              <h3 className="font-sans font-semibold text-text text-sm mb-1">
                Nutrition
              </h3>
              <ul className="font-sans text-sm text-muted space-y-0.5">
                {plan.nutritionReminders!.map((r, i) => (
                  <li key={i}>✓ {r}</li>
                ))}
              </ul>
            </div>
          )}
          {(plan.notes?.length ?? 0) > 0 && (
            <div>
              <h3 className="font-sans font-semibold text-text text-sm mb-1">
                Notes
              </h3>
              <ul className="font-sans text-sm text-muted space-y-0.5">
                {plan.notes!.map((n, i) => (
                  <li key={i}>· {n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const EQUIPMENT_SECTIONS: { key: 'none' | 'home' | 'full'; label: string; subtitle: string }[] = [
  { key: 'none', label: 'No gym', subtitle: 'Bodyweight, bands, minimal or no equipment' },
  { key: 'home', label: 'Home gym', subtitle: 'Dumbbells, bands, bench or pull-up bar' },
  { key: 'full', label: 'Full gym', subtitle: 'Barbells, rack, cables, full equipment' },
];

export default function WorkoutsPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl text-accent uppercase tracking-wide">
          Workouts
        </h1>
        <p className="font-sans text-muted mt-2">
          No photo or analysis required—pick a plan and start training. Click a plan to expand
          and see each day and exercise.
        </p>
      </div>
      {EQUIPMENT_SECTIONS.map((section) => {
        const plans = WORKOUT_PLANS.filter((p) => p.equipment === section.key);
        if (plans.length === 0) return null;
        return (
          <section key={section.key}>
            <h2 className="font-display text-xl text-accent uppercase tracking-wide mb-1">
              {section.label}
            </h2>
            <p className="font-sans text-sm text-muted mb-4">{section.subtitle}</p>
            <div className="space-y-4">
              {plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
