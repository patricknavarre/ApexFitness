'use client';

import { useState, useEffect, useCallback } from 'react';
import type { InteractiveWorkoutDay } from '@/lib/recoveryWorkoutData';
import { EQUIP_COLORS } from '@/lib/recoveryWorkoutData';
import { getPhaseColors } from '@/lib/interactive-workouts';
import { todayLocal } from '@/lib/local-date';
import { RestTimer } from './RestTimer';
import { ExerciseGuide } from './ExerciseGuide';
import { toast } from 'sonner';

type Props = {
  planId: string;
  dayNumber: number;
  dayTitle: string;
  workout: InteractiveWorkoutDay;
  equipment?: string[];
  onClose: () => void;
  onMarkDone?: () => void;
};

type SetRow = { weight: string; reps: string };

type LastHint = { weight: number; reps: number; setCount: number };

/** localStorage keys for set checkboxes (legacy = forever; dated = today only). */
export function workoutDoneStorageKeys(planId: string, dayNumber: number, date = todayLocal()) {
  return {
    legacy: `apexWorkoutDone-${planId}-${dayNumber}`,
    today: `apexWorkoutDone-${planId}-${dayNumber}-${date}`,
  };
}

/** Clear set-checkbox progress so the next Start workout begins fresh. */
export function clearWorkoutSetProgress(planId: string, dayNumber: number) {
  try {
    const { legacy, today } = workoutDoneStorageKeys(planId, dayNumber);
    localStorage.removeItem(legacy);
    localStorage.removeItem(today);
  } catch {
    // ignore
  }
}

function totalSets(workout: InteractiveWorkoutDay): number {
  return workout.sections.reduce(
    (a, section) => a + section.exercises.reduce((b, ex) => b + ex.sets, 0),
    0
  );
}

function completedCount(
  workout: InteractiveWorkoutDay,
  done: Record<string, boolean>,
  dayIdx: number
): number {
  return workout.sections.reduce(
    (a, section) =>
      a +
      section.exercises.reduce(
        (b, ex) =>
          b +
          Array.from({ length: ex.sets }).filter((_, si) => done[`${dayIdx}-${ex.name}-${si}`])
            .length,
        0
      ),
    0
  );
}

function parsePrescribedReps(reps: string): string {
  const m = reps.match(/\d+/);
  return m ? m[0] : '';
}

function emptyRows(setCount: number, defaultReps: string): SetRow[] {
  return Array.from({ length: setCount }, () => ({ weight: '', reps: defaultReps }));
}

export function InteractiveWorkout({
  planId,
  dayNumber,
  dayTitle,
  workout,
  equipment,
  onClose,
  onMarkDone,
}: Props) {
  const { today: storageKey, legacy: legacyStorageKey } = workoutDoneStorageKeys(
    planId,
    dayNumber
  );
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);
  const [showEquip, setShowEquip] = useState(false);
  const [timerVisible, setTimerVisible] = useState(false);
  const [restDuration, setRestDuration] = useState(90);
  const [setRows, setSetRows] = useState<Record<string, SetRow[]>>({});
  const [lastHints, setLastHints] = useState<Record<string, LastHint>>({});
  const [savingExercise, setSavingExercise] = useState<string | null>(null);

  const phaseColors = getPhaseColors(planId);
  const colors = phaseColors[workout.phase] ?? {
    bg: '#1e293b',
    accent: '#3b82f6',
    label: workout.phase,
  };

  useEffect(() => {
    try {
      localStorage.removeItem(legacyStorageKey);
      const saved = localStorage.getItem(storageKey);
      setDone(saved ? (JSON.parse(saved) as Record<string, boolean>) : {});
    } catch {
      setDone({});
    }
    setHydrated(true);
  }, [storageKey, legacyStorageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(done));
    } catch {
      // ignore
    }
  }, [done, storageKey, hydrated]);

  useEffect(() => {
    let cancelled = false;
    const initial: Record<string, SetRow[]> = {};
    for (const section of workout.sections) {
      for (const ex of section.exercises) {
        initial[ex.name] = emptyRows(ex.sets, parsePrescribedReps(ex.reps));
      }
    }
    setSetRows(initial);

    fetch(`/api/workout/sets?latest=1&planId=${encodeURIComponent(planId)}`)
      .then((res) => (res.ok ? res.json() : { logs: [] }))
      .then((data: { logs?: { exerciseName?: string | null; sets?: { weight: number; reps: number }[] }[] }) => {
        if (cancelled) return;
        const hints: Record<string, LastHint> = {};
        const nextRows: Record<string, SetRow[]> = { ...initial };
        for (const log of data.logs ?? []) {
          const name = log.exerciseName;
          if (!name || !log.sets?.length) continue;
          const ex = workout.sections.flatMap((s) => s.exercises).find((e) => e.name === name);
          if (!ex) continue;
          const defaultReps = parsePrescribedReps(ex.reps);
          const rows = emptyRows(ex.sets, defaultReps);
          for (let i = 0; i < rows.length; i++) {
            const src = log.sets[i] ?? log.sets[log.sets.length - 1];
            if (!src) continue;
            rows[i] = {
              weight: src.weight > 0 ? String(src.weight) : src.weight === 0 ? '0' : '',
              reps: src.reps > 0 ? String(src.reps) : defaultReps,
            };
          }
          nextRows[name] = rows;
          const top = log.sets.reduce((best, s) =>
            s.weight * s.reps > best.weight * best.reps ? s : best
          );
          hints[name] = {
            weight: top.weight,
            reps: top.reps,
            setCount: log.sets.length,
          };
        }
        setSetRows(nextRows);
        setLastHints(hints);
      })
      .catch(() => {
        // keep empty prefills
      });

    return () => {
      cancelled = true;
    };
  }, [planId, workout]);

  const closeTimer = useCallback(() => setTimerVisible(false), []);

  const toggleSet = useCallback(
    (exName: string, si: number) => {
      const key = `${dayNumber}-${exName}-${si}`;
      const wasUndone = !done[key];
      setDone((prev) => ({ ...prev, [key]: wasUndone }));
      if (wasUndone) setTimerVisible(true);
    },
    [dayNumber, done]
  );

  const isDone = (exName: string, si: number) => !!done[`${dayNumber}-${exName}-${si}`];

  function updateRow(exName: string, rowIdx: number, field: 'weight' | 'reps', value: string) {
    setSetRows((prev) => {
      const rows = [...(prev[exName] ?? [])];
      if (!rows[rowIdx]) return prev;
      rows[rowIdx] = { ...rows[rowIdx], [field]: value };
      return { ...prev, [exName]: rows };
    });
  }

  async function saveLoads(exName: string) {
    const rows = setRows[exName] ?? [];
    const sets = rows
      .map((r, idx) => ({
        setIndex: idx + 1,
        weight: Number(r.weight) || 0,
        reps: Number(r.reps) || 0,
      }))
      .filter((s) => s.reps > 0);

    if (sets.length === 0) {
      toast.error('Enter reps for at least one set');
      return;
    }

    setSavingExercise(exName);
    try {
      const res = await fetch('/api/workout/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, dayNumber, exerciseName: exName, sets }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      const top = sets.reduce((best, s) =>
        s.weight * s.reps > best.weight * best.reps ? s : best
      );
      setLastHints((prev) => ({
        ...prev,
        [exName]: { weight: top.weight, reps: top.reps, setCount: sets.length },
      }));
      toast.success('Loads saved');
    } catch {
      toast.error('Could not save loads');
    } finally {
      setSavingExercise(null);
    }
  }

  const total = totalSets(workout);
  const completed = completedCount(workout, done, dayNumber);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = pct === 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg overflow-hidden">
      <header
        className="shrink-0 px-4 pt-4 pb-3 border-b border-border"
        style={{ backgroundColor: colors.bg }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Day {dayNumber} · {colors.label}
            </p>
            <h2 className="font-display text-2xl uppercase tracking-wide text-text">{dayTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-card border border-border px-3 py-1.5 font-sans text-xs text-muted hover:border-accent"
          >
            Exit
          </button>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 h-1 rounded-full bg-bg overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${pct}%`, backgroundColor: colors.accent }}
            />
          </div>
          <span className="font-mono text-xs text-muted shrink-0">{pct}%</span>
        </div>

        {workout.warmup && (
          <p className="font-sans text-xs text-muted mb-1">
            <span className="text-accent3 font-semibold">Warmup:</span> {workout.warmup}
          </p>
        )}
        {workout.caution && (
          <p className="font-sans text-xs text-accent2/80 italic">{workout.caution}</p>
        )}

        {equipment && equipment.length > 0 && (
          <button
            type="button"
            onClick={() => setShowEquip((v) => !v)}
            className="mt-2 font-sans text-xs text-accent3 hover:underline"
          >
            {showEquip ? 'Hide equipment' : 'Show equipment'}
          </button>
        )}
        {showEquip && equipment && (
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {equipment.map((e) => (
              <li
                key={e}
                className="rounded-full border border-border px-2 py-0.5 font-sans text-[10px] text-muted"
              >
                {e}
              </li>
            ))}
          </ul>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {workout.sections.map((section) => (
          <section key={section.title}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-sans font-semibold text-sm text-text">{section.title}</h3>
              {section.tag && (
                <span className="rounded-full bg-purple-900/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-purple-300">
                  {section.tag}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {section.exercises.map((ex) => {
                const exDone = Array.from({ length: ex.sets }).every((_, si) =>
                  isDone(ex.name, si)
                );
                const equipColor = EQUIP_COLORS[ex.equip] ?? '#64748b';
                const rows = setRows[ex.name] ?? emptyRows(ex.sets, parsePrescribedReps(ex.reps));
                const hint = lastHints[ex.name];
                return (
                  <div
                    key={ex.name}
                    className={`rounded-card border p-3 transition-colors ${
                      exDone
                        ? 'border-green-600/50 bg-green-950/20'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-sans text-sm font-medium text-text">{ex.name}</p>
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] text-white"
                        style={{ backgroundColor: equipColor }}
                      >
                        {ex.equip}
                      </span>
                    </div>
                    <p className="font-sans text-xs text-muted mb-1">
                      {ex.sets} sets × {ex.reps}
                    </p>
                    {hint && (
                      <p className="font-mono text-[10px] text-accent3 mb-1">
                        Last: {hint.setCount} sets, top {hint.weight} × {hint.reps}
                      </p>
                    )}
                    {ex.note && (
                      <p className="font-sans text-xs text-muted/80 mb-2 italic">{ex.note}</p>
                    )}
                    <div className="mb-2">
                      <ExerciseGuide exerciseName={ex.name} />
                    </div>

                    <div className="space-y-2 mb-2">
                      {rows.map((row, si) => (
                        <div key={si} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleSet(ex.name, si)}
                            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border-2 font-mono text-xs font-extrabold transition-colors"
                            style={{
                              borderColor: isDone(ex.name, si) ? colors.accent : '#334155',
                              backgroundColor: isDone(ex.name, si) ? colors.accent : 'transparent',
                              color: isDone(ex.name, si) ? '#fff' : '#475569',
                            }}
                          >
                            {isDone(ex.name, si) ? '✓' : si + 1}
                          </button>
                          <label className="flex flex-1 items-center gap-1.5 min-w-0">
                            <span className="font-mono text-[9px] uppercase text-muted shrink-0">
                              lbs
                            </span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="any"
                              placeholder="0"
                              value={row.weight}
                              onChange={(e) => updateRow(ex.name, si, 'weight', e.target.value)}
                              className="w-full min-w-0 rounded-lg border border-border bg-bg px-2 py-1.5 font-mono text-sm text-text outline-none focus:border-accent3"
                            />
                          </label>
                          <label className="flex flex-1 items-center gap-1.5 min-w-0">
                            <span className="font-mono text-[9px] uppercase text-muted shrink-0">
                              reps
                            </span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              placeholder="—"
                              value={row.reps}
                              onChange={(e) => updateRow(ex.name, si, 'reps', e.target.value)}
                              className="w-full min-w-0 rounded-lg border border-border bg-bg px-2 py-1.5 font-mono text-sm text-text outline-none focus:border-accent3"
                            />
                          </label>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => saveLoads(ex.name)}
                      disabled={savingExercise === ex.name}
                      className="w-full rounded-lg border border-border py-1.5 font-sans text-xs font-semibold text-muted hover:border-accent3 hover:text-accent3 disabled:opacity-40 transition-colors"
                    >
                      {savingExercise === ex.name ? 'Saving…' : 'Save loads'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {allDone && onMarkDone && (
        <div className="shrink-0 border-t border-border bg-card px-4 py-3">
          <button
            type="button"
            onClick={onMarkDone}
            className="w-full rounded-card bg-accent py-3 font-sans text-sm font-bold uppercase text-black hover:shadow-glow"
          >
            Mark workout complete
          </button>
        </div>
      )}

      <RestTimer
        visible={timerVisible}
        duration={restDuration}
        accentColor={colors.accent}
        onClose={closeTimer}
        onDurationChange={setRestDuration}
      />
    </div>
  );
}
