'use client';

import { useState, useEffect } from 'react';
import {
  WORKOUT_PLANS,
  getTodaysDay,
  type WorkoutPlan as WorkoutPlanType,
  type WorkoutDay,
} from '@/lib/workout-plans';
import { CARDIO_OPTIONS } from '@/lib/cardio';
import { toast } from 'sonner';

function DayCard({
  planId,
  day,
  isToday,
  isLogged,
  onMarkDone,
  markingDone,
  latestSetLogs,
  onSetsLogged,
}: {
  planId: string;
  day: WorkoutDay;
  isToday?: boolean;
  isLogged?: boolean;
  onMarkDone?: () => void;
  markingDone?: boolean;
  latestSetLogs: Record<string, WorkoutSetLog | undefined>;
  onSetsLogged?: () => void;
}) {
  const [open, setOpen] = useState(!!isToday);
  const [exerciseOpen, setExerciseOpen] = useState<Record<number, boolean>>({});
  const [exerciseSets, setExerciseSets] = useState<
    Record<
      number,
      {
        weight: string;
        reps: string;
      }[]
    >
  >({});

  function ensureRows(idx: number) {
    setExerciseSets((prev) => {
      if (prev[idx] && prev[idx].length > 0) return prev;
      return {
        ...prev,
        [idx]: [
          { weight: '', reps: '' },
          { weight: '', reps: '' },
          { weight: '', reps: '' },
        ],
      };
    });
  }

  function updateRow(
    exIdx: number,
    rowIdx: number,
    field: 'weight' | 'reps',
    value: string
  ) {
    setExerciseSets((prev) => {
      const rows = prev[exIdx] ?? [];
      const next = [...rows];
      while (next.length <= rowIdx) {
        next.push({ weight: '', reps: '' });
      }
      next[rowIdx] = { ...next[rowIdx], [field]: value };
      return { ...prev, [exIdx]: next };
    });
  }

  function addRow(exIdx: number) {
    setExerciseSets((prev) => {
      const rows = prev[exIdx] ?? [];
      if (rows.length >= 6) return prev;
      return { ...prev, [exIdx]: [...rows, { weight: '', reps: '' }] };
    });
  }

  async function saveSets(exIdx: number, exerciseName: string) {
    const rows = exerciseSets[exIdx] ?? [];
    const cleaned = rows
      .map((r, idx) => ({
        setIndex: idx + 1,
        weight: Number(r.weight) || 0,
        reps: Number(r.reps) || 0,
      }))
      .filter((s) => s.weight > 0 && s.reps > 0);
    if (cleaned.length === 0) {
      toast.error('Enter weight and reps for at least one set');
      return;
    }
    try {
      const res = await fetch('/api/workout/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          dayNumber: day.dayNumber,
          exerciseName,
          sets: cleaned,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save sets');
      toast.success('Sets logged');
      setExerciseOpen((prev) => ({ ...prev, [exIdx]: false }));
      onSetsLogged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save sets');
    }
  }

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
            <div key={i} className="space-y-1">
              <div className="flex justify-between gap-4 font-sans text-sm text-text">
                <span>{ex.name}</span>
                <span className="text-muted shrink-0">
                  {ex.sets} × {ex.reps}
                </span>
              </div>
              {(() => {
                const key = `${planId}:${day.dayNumber}:${ex.name}`;
                const last = latestSetLogs[key];
                if (!last || !last.sets || last.sets.length === 0) return null;
                const totalSets = last.sets.length;
                const topSet = last.sets.reduce(
                  (best, s) => (s.weight * s.reps > best.weight * best.reps ? s : best),
                  last.sets[0]
                );
                return (
                  <p className="font-sans text-xs text-muted">
                    Last: {totalSets} sets, top {topSet.weight} × {topSet.reps}
                  </p>
                );
              })()}
              <button
                type="button"
                onClick={() => {
                  setExerciseOpen((prev) => ({
                    ...prev,
                    [i]: !prev[i],
                  }));
                  ensureRows(i);
                }}
                className="text-accent3 font-sans text-xs hover:underline"
              >
                {exerciseOpen[i] ? 'Hide sets' : 'Log sets'}
              </button>
              {exerciseOpen[i] && (
                <div className="mt-1 border border-border rounded-card p-3 bg-bg3/40 space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(exerciseSets[i] ?? []).map((row, rowIdx) => (
                      <div key={rowIdx} className="flex gap-1 items-center">
                        <span className="font-sans text-xs text-muted w-6">
                          {rowIdx + 1}.
                        </span>
                        <input
                          type="number"
                          placeholder="Weight"
                          min={0}
                          className="bg-bg3 border border-border rounded-card px-2 py-1 text-xs text-text w-20"
                          value={row.weight}
                          onChange={(e) =>
                            updateRow(i, rowIdx, 'weight', e.target.value)
                          }
                        />
                        <input
                          type="number"
                          placeholder="Reps"
                          min={0}
                          className="bg-bg3 border border-border rounded-card px-2 py-1 text-xs text-text w-16"
                          value={row.reps}
                          onChange={(e) =>
                            updateRow(i, rowIdx, 'reps', e.target.value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addRow(i)}
                    className="font-sans text-xs text-accent hover:underline"
                  >
                    + Add set
                  </button>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => saveSets(i, ex.name)}
                      className="bg-accent text-black font-sans font-bold text-xs uppercase px-3 py-1.5 rounded-card hover:shadow-glow"
                    >
                      Save sets
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setExerciseOpen((prev) => ({ ...prev, [i]: false }))
                      }
                      className="bg-bg3 border border-border text-text font-sans text-xs px-3 py-1.5 rounded-card hover:border-accent"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
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
  latestSetLogs,
  onSetsLogged,
}: {
  plan: WorkoutPlanType;
  activePlanId: string | null;
  planStartedAt: string | null;
  recentLogs: LogEntry[];
  onGetStarted: (planId: string) => void;
  onSwitchPlan: (planId: string) => void;
  onMarkDone: (planId: string, dayNumber: number) => void;
  markingDone: boolean;
  latestSetLogs: Record<string, WorkoutSetLog | undefined>;
  onSetsLogged?: () => void;
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
                planId={plan.id}
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
                latestSetLogs={latestSetLogs}
                onSetsLogged={onSetsLogged}
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

type WorkoutSetLog = {
  id: string;
  planId: string | null;
  dayNumber: number | null;
  exerciseName: string | null;
  sets: { setIndex: number; weight: number; reps: number }[];
  loggedAt: string | null;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function WorkoutsPage() {
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [planStartedAt, setPlanStartedAt] = useState<string | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingDone, setMarkingDone] = useState(false);
  const [cardioExercise, setCardioExercise] = useState<string>(CARDIO_OPTIONS[0]?.id ?? 'cycling');
  const [cardioMinutes, setCardioMinutes] = useState<number | ''>(30);
  const [cardioLoading, setCardioLoading] = useState(false);
   const [latestSetLogs, setLatestSetLogs] = useState<
    Record<string, WorkoutSetLog | undefined>
  >({});

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

  async function refreshSetLogs() {
    try {
      const res = await fetch(`/api/workout/sets?date=${todayISO()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load sets');
      const logs: WorkoutSetLog[] = (data.logs ?? []).map((l: WorkoutSetLog) => l);
      const map: Record<string, WorkoutSetLog> = {};
      for (const log of logs) {
        if (!log.exerciseName || !log.planId || log.dayNumber == null) continue;
        const key = `${log.planId}:${log.dayNumber}:${log.exerciseName}`;
        const existing = map[key];
        if (!existing) {
          map[key] = log;
        } else {
          const existingTime = existing.loggedAt ? Date.parse(existing.loggedAt) : 0;
          const thisTime = log.loggedAt ? Date.parse(log.loggedAt) : 0;
          if (thisTime > existingTime) map[key] = log;
        }
      }
      setLatestSetLogs(map);
    } catch {
      // ignore; sets are optional
    }
  }

  useEffect(() => {
    refreshSetLogs();
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
    // Use local calendar date so Day 1 is the day they started (avoids UTC vs local mismatch)
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const startedAt = `${y}-${m}-${day}`;
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

  async function logCardio() {
    const minutes = cardioMinutes === '' ? 0 : Number(cardioMinutes);
    if (!(minutes >= 1 && minutes <= 300)) {
      toast.error('Enter 1–300 minutes');
      return;
    }
    setCardioLoading(true);
    try {
      const res = await fetch('/api/workout/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardioExercise,
          cardioDurationMinutes: minutes,
        }),
      });
      if (!res.ok) throw new Error('Failed to log');
      const data = await res.json();
      setWorkoutLogs((prev) => [
        {
          planId: data.planId ?? null,
          dayNumber: data.dayNumber ?? null,
          loggedAt: data.loggedAt ?? null,
        },
        ...prev,
      ]);
      setCardioMinutes(30);
      toast.success('Cardio logged.');
    } catch {
      toast.error('Could not log cardio');
    }
    setCardioLoading(false);
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

      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="font-display text-lg text-accent uppercase tracking-wide mb-3">
          Log cardio
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="font-sans text-sm text-muted">
            Exercise
            <select
              value={cardioExercise}
              onChange={(e) => setCardioExercise(e.target.value)}
              className="ml-2 bg-bg3 border border-border text-text font-sans text-sm px-3 py-2 rounded-card focus:outline-none focus:border-accent"
            >
              {CARDIO_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="font-sans text-sm text-muted">
            Minutes
            <input
              type="number"
              min={1}
              max={300}
              value={cardioMinutes}
              onChange={(e) => {
                const v = e.target.value;
                setCardioMinutes(v === '' ? '' : Math.min(300, Math.max(0, Number(v))));
              }}
              className="ml-2 w-20 bg-bg3 border border-border text-text font-sans text-sm px-3 py-2 rounded-card focus:outline-none focus:border-accent"
            />
          </label>
          <button
            type="button"
            onClick={logCardio}
            disabled={cardioLoading}
            className="bg-accent text-black font-sans font-bold text-sm uppercase px-4 py-2 rounded-card hover:shadow-glow disabled:opacity-50"
          >
            {cardioLoading ? 'Logging…' : 'Log cardio'}
          </button>
        </div>
      </section>

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
                    latestSetLogs={latestSetLogs}
                    onSetsLogged={refreshSetLogs}
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
