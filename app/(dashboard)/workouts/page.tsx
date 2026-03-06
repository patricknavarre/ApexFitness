'use client';

import { useState, useEffect } from 'react';
import {
  WORKOUT_PLANS,
  type WorkoutPlan as WorkoutPlanType,
  type WorkoutDay,
} from '@/lib/workout-plans';
import { toast } from 'sonner';

function getTodaysDay(
  plan: WorkoutPlanType,
  planStartedAt: string
): { day: WorkoutDay; dayNumber: number } | null {
  const start = new Date(planStartedAt);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 0 || plan.days.length === 0) return null;
  const dayIndex = diffDays % plan.days.length;
  const day = plan.days[dayIndex];
  return { day, dayNumber: day.dayNumber };
}

function DayCard({
  day,
  isToday,
  isLogged,
  onMarkDone,
  markingDone,
}: {
  day: WorkoutDay;
  isToday?: boolean;
  isLogged?: boolean;
  onMarkDone?: () => void;
  markingDone?: boolean;
}) {
  const [open, setOpen] = useState(!!isToday);
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
          {isToday && (
            <span className="ml-2 font-mono text-xs text-accent3 uppercase">Today</span>
          )}
          {isLogged && <span className="ml-2 text-accent text-xs">Done</span>}
        </span>
        <span className="text-muted text-sm">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          {isToday && onMarkDone && !isLogged && (
            <div className="pb-2">
              <button
                type="button"
                onClick={onMarkDone}
                disabled={markingDone}
                className="bg-accent text-black font-sans font-bold text-sm uppercase px-3 py-2 rounded-card hover:shadow-glow disabled:opacity-50"
              >
                {markingDone ? 'Logging…' : 'Mark done'}
              </button>
            </div>
          )}
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

function PlanCard({
  plan,
  activePlanId,
  planStartedAt,
  recentLogs,
  onGetStarted,
  onSwitchPlan,
  onMarkDone,
  markingDone,
}: {
  plan: WorkoutPlanType;
  activePlanId: string | null;
  planStartedAt: string | null;
  recentLogs: LogEntry[];
  onGetStarted: (planId: string) => void;
  onSwitchPlan: (planId: string) => void;
  onMarkDone: (planId: string, dayNumber: number) => void;
  markingDone: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isActive = activePlanId === plan.id;
  const todays = planStartedAt && isActive ? getTodaysDay(plan, planStartedAt) : null;
  const todayStr = new Date().toISOString().slice(0, 10);
  const isTodayLogged =
    todays &&
    recentLogs.some(
      (l) =>
        l.planId === plan.id &&
        l.dayNumber === todays.dayNumber &&
        l.loggedAt &&
        l.loggedAt.startsWith(todayStr)
    );

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
          {todays && (
            <p className="font-sans text-sm text-accent3 mt-2">
              Today: Day {todays.dayNumber} — {todays.day.title}
            </p>
          )}
        </div>
        <span className="text-muted text-sm">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          {!isActive ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onGetStarted(plan.id);
                }}
                className="bg-accent text-black font-sans font-bold text-sm uppercase px-4 py-2 rounded-card hover:shadow-glow"
              >
                Get started
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSwitchPlan(plan.id);
                }}
                className="bg-bg3 border border-border text-text font-sans text-sm px-4 py-2 rounded-card hover:border-accent"
              >
                Switch to this plan
              </button>
            </div>
          )}
          <div className="grid gap-2">
            {plan.days.map((day) => (
              <DayCard
                key={day.dayNumber}
                day={day}
                isToday={todays?.dayNumber === day.dayNumber}
                isLogged={
                  todays?.dayNumber === day.dayNumber &&
                  !!recentLogs.find(
                    (l) =>
                      l.planId === plan.id &&
                      l.dayNumber === day.dayNumber &&
                      l.loggedAt &&
                      l.loggedAt.startsWith(todayStr)
                  )
                }
                onMarkDone={
                  todays?.dayNumber === day.dayNumber && isActive
                    ? () => onMarkDone(plan.id, day.dayNumber)
                    : undefined
                }
                markingDone={markingDone}
              />
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

type LogEntry = { planId: string | null; dayNumber: number | null; loggedAt: string | null };

export default function WorkoutsPage() {
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [planStartedAt, setPlanStartedAt] = useState<string | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingDone, setMarkingDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/me')
      .then((res) => (res.ok ? res.json() : { activePlanId: null, planStartedAt: null }))
      .then((data) => {
        if (!cancelled) {
          setActivePlanId(data.activePlanId ?? null);
          setPlanStartedAt(data.planStartedAt ?? null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/workout/log?limit=50')
      .then((res) => (res.ok ? res.json() : { logs: [] }))
      .then((data) => {
        if (!cancelled) setWorkoutLogs(data.logs ?? []);
      })
      .catch(() => {
        if (!cancelled) setWorkoutLogs([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function setActivePlan(planId: string) {
    const startedAt = new Date().toISOString().slice(0, 10);
    try {
      const res = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activePlanId: planId, planStartedAt: startedAt }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setActivePlanId(planId);
      setPlanStartedAt(startedAt);
      toast.success('Plan set. Today is Day 1.');
    } catch {
      toast.error('Could not set plan');
    }
  }

  async function markDayDone(planId: string, dayNumber: number) {
    setMarkingDone(true);
    try {
      const res = await fetch('/api/workout/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, dayNumber }),
      });
      if (!res.ok) throw new Error('Failed to log');
      const data = await res.json();
      setWorkoutLogs((prev) => [
        { planId: data.planId, dayNumber: data.dayNumber, loggedAt: data.loggedAt },
        ...prev,
      ]);
      toast.success('Workout logged.');
    } catch {
      toast.error('Could not log workout');
    }
    setMarkingDone(false);
  }

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
      {loading ? (
        <p className="font-sans text-muted">Loading…</p>
      ) : (
        EQUIPMENT_SECTIONS.map((section) => {
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
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    activePlanId={activePlanId}
                    planStartedAt={planStartedAt}
                    recentLogs={workoutLogs}
                    onGetStarted={setActivePlan}
                    onSwitchPlan={setActivePlan}
                    onMarkDone={markDayDone}
                    markingDone={markingDone}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
