'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { toast } from 'sonner';
import { WORKOUT_PLANS } from '@/lib/workout-plans';
import { CARDIO_OPTIONS, getCardioLabel } from '@/lib/cardio';
import { MomentumCard } from '@/components/progress/MomentumCard';
import { evaluateRestDayMacros, type RestMacroStatus } from '@/lib/rest-day-macros';

type AnalysisSummary = {
  bodyType?: string;
  bodyFatRange?: string;
  summary?: string;
};

type ProgressPhotoItem = {
  id: string;
  photoUrl: string;
  thumbnailUrl: string;
  takenAt: string;
  weightKg: number | null;
  analysis: AnalysisSummary | null;
};

type WorkoutItem = {
  planId: string | null;
  dayNumber: number | null;
  caloriesBurned: number;
  cardioExercise?: string | null;
  cardioDurationMinutes?: number | null;
  isRestDay?: boolean;
};

type DaySummary = {
  date: string;
  intake: number;
  totalBurn: number;
  surplus: number;
  workouts: WorkoutItem[];
};

function getPlanDayLabel(planId: string | null, dayNumber: number | null): string {
  if (!planId) return 'Workout';
  const plan = WORKOUT_PLANS.find((p) => p.id === planId);
  if (!plan) return dayNumber != null ? `Plan day ${dayNumber}` : 'Workout';
  return `${plan.name} Day ${dayNumber}`;
}

function getWorkoutLabel(w: WorkoutItem): string {
  if (w.isRestDay) return 'Rest';
  if (w.cardioExercise && w.cardioDurationMinutes != null) {
    return `${getCardioLabel(w.cardioExercise)} ${w.cardioDurationMinutes} min`;
  }
  return getPlanDayLabel(w.planId, w.dayNumber);
}

function parseBodyFatMidpoint(range?: string): number | null {
  if (!range) return null;
  const nums = range.match(/[\d.]+/g)?.map(Number) ?? [];
  if (nums.length === 0) return null;
  if (nums.length === 1) return nums[0];
  return (nums[0] + nums[1]) / 2;
}

type ExerciseMax = {
  exerciseName: string;
  weight: number;
  reps: number;
  loggedAt: string | null;
};

export default function ProgressPage() {
  const [photos, setPhotos] = useState<ProgressPhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailySummary, setDailySummary] = useState<DaySummary[] | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [exerciseMaxes, setExerciseMaxes] = useState<ExerciseMax[]>([]);
  const [maxesLoading, setMaxesLoading] = useState(true);
  const [maxesOpen, setMaxesOpen] = useState(false);
  const [calorieBalanceOpen, setCalorieBalanceOpen] = useState(false);
  const [compareLeft, setCompareLeft] = useState<string>('');
  const [compareRight, setCompareRight] = useState<string>('');
  const [sliderPos, setSliderPos] = useState(50);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [planStartedAt, setPlanStartedAt] = useState<string | null>(null);
  const compareContainerRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [logMode, setLogMode] = useState<'plan' | 'cardio'>('plan');
  const [logPlanId, setLogPlanId] = useState<string>(WORKOUT_PLANS[0]?.id ?? '');
  const [logDayNumber, setLogDayNumber] = useState<number>(1);
  const [cardioExercise, setCardioExercise] = useState(CARDIO_OPTIONS[0]?.id ?? 'cycling');
  const [cardioMinutes, setCardioMinutes] = useState<number | ''>(30);
  const [logging, setLogging] = useState(false);
  const [restMacroStatus, setRestMacroStatus] = useState<RestMacroStatus | null>(null);
  const [restMacroLoading, setRestMacroLoading] = useState(false);

  const refreshDailySummary = useCallback(() => {
    setSummaryLoading(true);
    return fetch('/api/progress/daily-summary?days=14')
      .then((res) => (res.ok ? res.json() : { days: [] }))
      .then((data) => {
        setDailySummary(data.days ?? []);
      })
      .catch(() => {
        setDailySummary([]);
      })
      .finally(() => {
        setSummaryLoading(false);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/progress')
      .then((res) => (res.ok ? res.json() : { photos: [] }))
      .then((data) => {
        if (!cancelled) setPhotos(data.photos ?? []);
      })
      .catch(() => {
        if (!cancelled) setPhotos([]);
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
    fetch('/api/progress/daily-summary?days=14')
      .then((res) => (res.ok ? res.json() : { days: [] }))
      .then((data) => {
        if (!cancelled) setDailySummary(data.days ?? []);
      })
      .catch(() => {
        if (!cancelled) setDailySummary([]);
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/workout/sets?maxes=1')
      .then((res) => (res.ok ? res.json() : { maxes: [] }))
      .then((data: { maxes?: ExerciseMax[] }) => {
        if (!cancelled) setExerciseMaxes(data.maxes ?? []);
      })
      .catch(() => {
        if (!cancelled) setExerciseMaxes([]);
      })
      .finally(() => {
        if (!cancelled) setMaxesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/me')
      .then((res) => (res.ok ? res.json() : Promise.resolve({})))
      .then(
        (data: {
          activePlanId?: string | null;
          planStartedAt?: string | null;
        }) => {
          if (cancelled) return;
          setActivePlanId(data.activePlanId ?? null);
          setPlanStartedAt(
            typeof data.planStartedAt === 'string' ? data.planStartedAt.slice(0, 10) : null
          );
          if (data.activePlanId) setLogPlanId(data.activePlanId);
        }
      )
      .catch(() => {
        // ignore
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setRestMacroStatus(null);
      return;
    }
    let cancelled = false;
    setRestMacroLoading(true);
    Promise.all([
      fetch(`/api/nutrition?date=${selectedDate}`).then((r) =>
        r.ok ? r.json() : { entries: [] }
      ),
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
        setRestMacroStatus(
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
        if (!cancelled) setRestMacroStatus(null);
      })
      .finally(() => {
        if (!cancelled) setRestMacroLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  useEffect(() => {
    const plan = WORKOUT_PLANS.find((p) => p.id === logPlanId);
    if (!plan?.days.length) return;
    if (!plan.days.some((d) => d.dayNumber === logDayNumber)) {
      const firstWorkout = plan.days.find((d) => !d.isRest) ?? plan.days[0];
      setLogDayNumber(firstWorkout.dayNumber);
    }
  }, [logPlanId, logDayNumber]);

  useEffect(() => {
    if (photos.length > 0 && !compareLeft) setCompareLeft(photos[0].id);
    if (photos.length > 1 && !compareRight) setCompareRight(photos[1].id);
  }, [photos, compareLeft, compareRight]);

  const selectedDay = dailySummary?.find((d) => d.date === selectedDate) ?? null;
  const logPlan = WORKOUT_PLANS.find((p) => p.id === logPlanId);
  const selectedHasRest = !!selectedDay?.workouts.some((w) => w.isRestDay);

  async function submitPlanOrCardio() {
    if (!selectedDate) return;
    setLogging(true);
    try {
      const body =
        logMode === 'cardio'
          ? {
              logDate: selectedDate,
              cardioExercise,
              cardioDurationMinutes:
                cardioMinutes === '' ? 0 : Number(cardioMinutes),
            }
          : {
              logDate: selectedDate,
              planId: logPlanId,
              dayNumber: logDayNumber,
            };
      const res = await fetch('/api/workout/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to log');
      toast.success(logMode === 'cardio' ? 'Cardio logged' : 'Workout logged');
      await refreshDailySummary();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not log workout');
    } finally {
      setLogging(false);
    }
  }

  async function submitRestDay() {
    if (!selectedDate) return;
    setLogging(true);
    try {
      const res = await fetch('/api/workout/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restDay: true, logDate: selectedDate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not credit rest day');
      toast.success('Rest day credited to your streak');
      await refreshDailySummary();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not credit rest day');
    } finally {
      setLogging(false);
    }
  }

  const leftPhoto = photos.find((p) => p.id === compareLeft);
  const rightPhoto = photos.find((p) => p.id === compareRight);
  const canCompare = leftPhoto && rightPhoto && leftPhoto.id !== rightPhoto.id;

  const sortedPhotos = [...photos].sort(
    (a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()
  );
  const bodyFatData = sortedPhotos
    .map((p) => ({
      date: format(new Date(p.takenAt), 'MMM d'),
      bodyFat: parseBodyFatMidpoint(p.analysis?.bodyFatRange ?? undefined),
    }))
    .filter((d) => d.bodyFat != null);
  const weightData = sortedPhotos
    .filter((p) => p.weightKg != null && p.weightKg > 0)
    .map((p) => ({
      date: format(new Date(p.takenAt), 'MMM d'),
      weight: Math.round((p.weightKg ?? 0) * 2.205),
    }));

  const weeklyActivity = (dailySummary ?? [])
    .slice(0, 7)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({
      date: format(new Date(day.date + 'T12:00:00'), 'EEE'),
      workouts: day.workouts.length,
      burn: day.totalBurn,
    }));

  async function handleDeletePhoto(id: string) {
    if (!confirm('Delete this progress photo?')) return;
    try {
      const res = await fetch(`/api/progress?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      toast.success('Photo deleted');
    } catch {
      toast.error('Could not delete photo');
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl text-tan uppercase tracking-wide">Progress</h1>
        <div className="rounded-card border border-border bg-bg2 h-64 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl text-tan uppercase tracking-wide">Progress</h1>
        <p className="font-sans text-muted mt-2">
          Momentum, milestones, and your photo timeline.
        </p>
      </div>

      <MomentumCard
        activePlanId={activePlanId}
        planStartedAt={planStartedAt}
        variant="full"
      />

      <section>
        <button
          type="button"
          onClick={() => setMaxesOpen((o) => !o)}
          className="w-full flex items-start justify-between gap-3 text-left group"
          aria-expanded={maxesOpen}
        >
          <div>
            <h2 className="font-display text-xl text-tan uppercase tracking-wide">
              Exercise maxes
            </h2>
            <p className="font-sans text-muted text-sm mt-1">
              {maxesLoading
                ? 'Loading…'
                : exerciseMaxes.length > 0
                  ? `${exerciseMaxes.length} exercises · tap to ${maxesOpen ? 'hide' : 'show'}`
                  : 'No loads logged yet'}
            </p>
          </div>
          <span
            className={`shrink-0 mt-1 font-mono text-sm text-muted transition-transform duration-200 ${
              maxesOpen ? 'rotate-180' : ''
            }`}
            aria-hidden
          >
            ▾
          </span>
        </button>
        {maxesOpen && (
          <div className="mt-4">
            {maxesLoading ? (
              <div className="rounded-card border border-border bg-card p-6 font-sans text-muted text-sm">
                Loading…
              </div>
            ) : exerciseMaxes.length > 0 ? (
              <div className="rounded-card border border-border bg-card overflow-hidden max-h-72 overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full font-sans text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border text-left text-muted">
                        <th className="p-3 font-medium">Exercise</th>
                        <th className="p-3 font-medium">Weight</th>
                        <th className="p-3 font-medium">Reps</th>
                        <th className="p-3 font-medium">Logged</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exerciseMaxes.map((row) => (
                        <tr
                          key={row.exerciseName}
                          className="border-b border-border last:border-0"
                        >
                          <td className="p-3 text-text">{row.exerciseName}</td>
                          <td className="p-3 font-mono text-text">
                            {row.weight === 0 ? 'BW' : `${row.weight} lb`}
                          </td>
                          <td className="p-3 font-mono text-text">{row.reps}</td>
                          <td className="p-3 text-muted">
                            {row.loggedAt
                              ? format(new Date(row.loggedAt), 'MMM d, yyyy')
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-card border border-border bg-card p-6 font-sans text-muted text-sm">
                No loads logged yet. Complete sets in Interactive Workout to build your maxes.
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl text-tan uppercase tracking-wide mb-2">
          Weekly activity
        </h2>
        <p className="font-sans text-muted text-sm mb-4">
          Workouts logged and estimated burn over the last 7 days.
        </p>
        {summaryLoading ? (
          <div className="rounded-card border border-border bg-card p-6 font-sans text-muted text-sm">
            Loading…
          </div>
        ) : weeklyActivity.length > 0 ? (
          <div className="rounded-card border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4B5320" />
                <XAxis dataKey="date" tick={{ fill: '#8B7355', fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  allowDecimals={false}
                  tick={{ fill: '#8B7355', fontSize: 11 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#8B7355', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#161a10',
                    border: '1px solid #4B5320',
                    borderRadius: 8,
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="workouts"
                  name="Workouts"
                  fill="#C4A35A"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="burn"
                  name="Burn (cal)"
                  fill="#4B5320"
                  radius={[4, 4, 0, 0]}
                  opacity={0.9}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-card border border-border bg-card p-6 font-sans text-muted text-sm">
            No activity yet. Complete a workout to light this up.
          </div>
        )}
      </section>

      <section>
        <button
          type="button"
          onClick={() => setCalorieBalanceOpen((o) => !o)}
          className="w-full flex items-start justify-between gap-3 text-left group"
          aria-expanded={calorieBalanceOpen}
        >
          <div>
            <h2 className="font-display text-xl text-tan uppercase tracking-wide">
              Daily calorie balance
            </h2>
            <p className="font-sans text-muted text-sm mt-1">
              {summaryLoading
                ? 'Loading…'
                : dailySummary && dailySummary.length > 0
                  ? `Last 14 days · tap to ${calorieBalanceOpen ? 'hide' : 'show'}`
                  : 'No data yet'}
            </p>
          </div>
          <span
            className={`shrink-0 mt-1 font-mono text-sm text-muted transition-transform duration-200 ${
              calorieBalanceOpen ? 'rotate-180' : ''
            }`}
            aria-hidden
          >
            ▾
          </span>
        </button>
        {calorieBalanceOpen && (
          <div className="mt-4">
            <p className="font-sans text-muted text-sm mb-4">
              Tap a day to add food, log a workout, or credit rest.
            </p>
            {summaryLoading ? (
              <div className="rounded-card border border-border bg-card p-6 font-sans text-muted text-sm">
                Loading…
              </div>
            ) : dailySummary && dailySummary.length > 0 ? (
              <div className="rounded-card border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full font-sans text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted">
                        <th className="p-3 font-medium">Date</th>
                        <th className="p-3 font-medium">Intake</th>
                        <th className="p-3 font-medium">Workouts</th>
                        <th className="p-3 font-medium">Burn</th>
                        <th className="p-3 font-medium">Surplus / Deficit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySummary.map((day) => (
                        <tr
                          key={day.date}
                          className="border-b border-border last:border-0 cursor-pointer hover:bg-bg3/40 transition-colors"
                          onClick={() => setSelectedDate(day.date)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedDate(day.date);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`Open ${format(new Date(day.date + 'T12:00:00'), 'EEEE, MMM d')}`}
                        >
                          <td className="p-3 text-text">
                            {format(new Date(day.date + 'T12:00:00'), 'EEE, MMM d')}
                          </td>
                          <td className="p-3 text-text">{day.intake} cal</td>
                          <td className="p-3 text-text">
                            {day.workouts.length === 0
                              ? '—'
                              : day.workouts.map((w) => getWorkoutLabel(w)).join(', ')}
                          </td>
                          <td className="p-3 text-text">{day.totalBurn} cal</td>
                          <td className="p-3">
                            <span className={day.surplus >= 0 ? 'text-accent' : 'text-accent2'}>
                              {day.surplus >= 0 ? '+' : ''}
                              {day.surplus} cal
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-card border border-border bg-card p-6 font-sans text-muted text-sm">
                No data yet. Log meals in Nutrition and complete workouts to see balance.
              </div>
            )}
          </div>
        )}
      </section>

      {selectedDate && selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="day-panel-title"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-card border border-border bg-card p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3
                  id="day-panel-title"
                  className="font-display text-xl text-tan uppercase tracking-wide"
                >
                  {format(new Date(selectedDate + 'T12:00:00'), 'EEE, MMM d')}
                </h3>
                <p className="font-sans text-xs text-muted mt-1">
                  {selectedDay.intake} cal in · {selectedDay.totalBurn} burn ·{' '}
                  <span className={selectedDay.surplus >= 0 ? 'text-accent' : 'text-accent2'}>
                    {selectedDay.surplus >= 0 ? '+' : ''}
                    {selectedDay.surplus}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="min-h-[44px] rounded-card border border-border px-3 py-2 font-sans text-xs text-muted hover:border-accent"
              >
                Close
              </button>
            </div>

            {selectedDay.workouts.length > 0 && (
              <p className="font-sans text-sm text-text">
                Logged:{' '}
                {selectedDay.workouts.map((w) => getWorkoutLabel(w)).join(', ')}
              </p>
            )}

            <Link
              href={`/nutrition?date=${selectedDate}`}
              className="flex min-h-[44px] items-center justify-center rounded-card bg-accent px-4 py-2.5 font-sans text-sm font-bold uppercase text-black hover:shadow-glow"
            >
              Add food
            </Link>

            <div className="rounded-card border border-border p-3 space-y-3">
              <p className="font-sans text-sm font-semibold text-text">Log workout</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLogMode('plan')}
                  className={`min-h-[40px] flex-1 rounded-card border px-3 py-2 font-sans text-xs font-semibold ${
                    logMode === 'plan'
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-muted'
                  }`}
                >
                  Plan day
                </button>
                <button
                  type="button"
                  onClick={() => setLogMode('cardio')}
                  className={`min-h-[40px] flex-1 rounded-card border px-3 py-2 font-sans text-xs font-semibold ${
                    logMode === 'cardio'
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-muted'
                  }`}
                >
                  Cardio
                </button>
              </div>
              {logMode === 'plan' ? (
                <div className="space-y-2">
                  <label className="block font-sans text-xs text-muted">
                    Plan
                    <select
                      value={logPlanId}
                      onChange={(e) => setLogPlanId(e.target.value)}
                      className="mt-1 w-full min-h-[44px] rounded-lg border border-border bg-bg px-2 py-2 font-sans text-sm text-text"
                    >
                      {WORKOUT_PLANS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block font-sans text-xs text-muted">
                    Day
                    <select
                      value={logDayNumber}
                      onChange={(e) => setLogDayNumber(Number(e.target.value))}
                      className="mt-1 w-full min-h-[44px] rounded-lg border border-border bg-bg px-2 py-2 font-sans text-sm text-text"
                    >
                      {(logPlan?.days ?? []).map((d) => (
                        <option key={d.dayNumber} value={d.dayNumber}>
                          Day {d.dayNumber}: {d.title}
                          {d.isRest ? ' (Rest)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block font-sans text-xs text-muted">
                    Exercise
                    <select
                      value={cardioExercise}
                      onChange={(e) => setCardioExercise(e.target.value)}
                      className="mt-1 w-full min-h-[44px] rounded-lg border border-border bg-bg px-2 py-2 font-sans text-sm text-text"
                    >
                      {CARDIO_OPTIONS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block font-sans text-xs text-muted">
                    Minutes
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={cardioMinutes}
                      onChange={(e) =>
                        setCardioMinutes(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="mt-1 w-full min-h-[44px] rounded-lg border border-border bg-bg px-2 py-2 font-mono text-sm text-text"
                    />
                  </label>
                </div>
              )}
              <button
                type="button"
                disabled={logging}
                onClick={() => void submitPlanOrCardio()}
                className="w-full min-h-[44px] rounded-card bg-accent px-4 py-2.5 font-sans text-sm font-bold uppercase text-black disabled:opacity-40"
              >
                {logging ? 'Saving…' : 'Save workout'}
              </button>
            </div>

            <div className="rounded-card border border-border p-3 space-y-2">
              <p className="font-sans text-sm font-semibold text-text">Credit rest day</p>
              <p className="font-sans text-xs text-muted">
                {selectedHasRest
                  ? 'Rest already credited for this day.'
                  : restMacroLoading
                    ? 'Checking macros…'
                    : restMacroStatus?.message ??
                      'Rest counts toward streak when calories and protein targets are hit.'}
              </p>
              {!selectedHasRest && !restMacroStatus?.ready && (
                <Link
                  href={`/nutrition?date=${selectedDate}`}
                  className="inline-block font-sans text-xs text-accent hover:underline"
                >
                  Log food for this day
                </Link>
              )}
              <button
                type="button"
                disabled={
                  logging ||
                  restMacroLoading ||
                  selectedHasRest ||
                  !restMacroStatus?.ready
                }
                onClick={() => void submitRestDay()}
                className="w-full min-h-[44px] rounded-card border border-border px-4 py-2.5 font-sans text-sm font-bold uppercase text-text hover:border-accent disabled:opacity-40"
              >
                {logging ? 'Saving…' : selectedHasRest ? 'Rest credited' : 'Check off rest'}
              </button>
            </div>
          </div>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="rounded-card border border-border bg-card p-8 text-center">
          <p className="font-sans text-muted mb-4">
            No progress photos yet. Run an AI Analysis and choose &quot;Save to Progress
            timeline&quot; to add your first photo.
          </p>
          <Link
            href="/analysis"
            className="inline-block bg-accent text-black font-sans font-bold uppercase px-6 py-3 rounded-card hover:shadow-glow transition-shadow"
          >
            Go to AI Analysis
          </Link>
        </div>
      ) : (
        <>
          {(bodyFatData.length >= 2 || weightData.length >= 2) && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bodyFatData.length >= 2 && (
                <div className="rounded-card border border-border bg-card p-4">
                  <h2 className="font-display text-lg text-tan uppercase tracking-wide mb-3">
                    Body fat trend
                  </h2>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={bodyFatData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#4B5320" />
                      <XAxis dataKey="date" tick={{ fill: '#8B7355', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#8B7355', fontSize: 11 }} unit="%" />
                      <Tooltip />
                      <Line type="monotone" dataKey="bodyFat" stroke="#C4A35A" strokeWidth={2} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {weightData.length >= 2 && (
                <div className="rounded-card border border-border bg-card p-4">
                  <h2 className="font-display text-lg text-tan uppercase tracking-wide mb-3">
                    Weight trend
                  </h2>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={weightData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#4B5320" />
                      <XAxis dataKey="date" tick={{ fill: '#8B7355', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#8B7355', fontSize: 11 }} unit=" lbs" />
                      <Tooltip />
                      <Line type="monotone" dataKey="weight" stroke="#D2B48C" strokeWidth={2} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          )}

          {photos.length >= 2 && (
            <section>
              <h2 className="font-display text-xl text-tan uppercase tracking-wide mb-3">
                Compare
              </h2>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <select
                  value={compareLeft}
                  onChange={(e) => setCompareLeft(e.target.value)}
                  className="bg-bg2 border border-border rounded-card px-3 py-2 font-sans text-sm text-text"
                >
                  {photos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {format(new Date(p.takenAt), 'MMM d, yyyy')}
                    </option>
                  ))}
                </select>
                <span className="font-sans text-muted text-sm">vs</span>
                <select
                  value={compareRight}
                  onChange={(e) => setCompareRight(e.target.value)}
                  className="bg-bg2 border border-border rounded-card px-3 py-2 font-sans text-sm text-text"
                >
                  {photos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {format(new Date(p.takenAt), 'MMM d, yyyy')}
                    </option>
                  ))}
                </select>
              </div>
              {canCompare && (
                <div
                  ref={compareContainerRef}
                  className="relative rounded-card border border-border bg-bg2 overflow-hidden aspect-[3/4] max-h-[400px] select-none"
                >
                  <div className="absolute inset-0">
                    <img
                      src={rightPhoto!.photoUrl}
                      alt="After"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${sliderPos}%` }}
                  >
                    <img
                      src={leftPhoto!.photoUrl}
                      alt="Before"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-accent cursor-ew-resize z-10"
                    style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const onMove = (e2: MouseEvent) => {
                        const rect = compareContainerRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const next = ((e2.clientX - rect.left) / rect.width) * 100;
                        setSliderPos(Math.min(100, Math.max(0, next)));
                      };
                      const onUp = () => {
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onUp);
                      };
                      document.addEventListener('mousemove', onMove);
                      document.addEventListener('mouseup', onUp);
                      onMove(e.nativeEvent);
                    }}
                  />
                  <div className="absolute top-2 left-2 font-sans text-xs bg-black/60 text-white px-2 py-1 rounded">
                    {format(new Date(leftPhoto!.takenAt), 'MMM d, yyyy')}
                  </div>
                  <div className="absolute top-2 right-2 font-sans text-xs bg-black/60 text-white px-2 py-1 rounded">
                    {format(new Date(rightPhoto!.takenAt), 'MMM d, yyyy')}
                  </div>
                </div>
              )}
            </section>
          )}

          <section>
            <h2 className="font-display text-xl text-tan uppercase tracking-wide mb-3">
              Timeline
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="rounded-card border border-border bg-card overflow-hidden"
                >
                  <a
                    href={p.photoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-[3/4] bg-bg2"
                  >
                    <img
                      src={p.thumbnailUrl || p.photoUrl}
                      alt={format(new Date(p.takenAt), 'MMM d, yyyy')}
                      className="w-full h-full object-cover object-top"
                    />
                  </a>
                  <div className="p-3">
                    <p className="font-sans text-sm font-medium text-text">
                      {format(new Date(p.takenAt), 'MMM d, yyyy')}
                    </p>
                    {p.weightKg != null && p.weightKg > 0 && (
                      <p className="font-sans text-xs text-muted mt-0.5">
                        {Math.round(p.weightKg * 2.205)} lbs
                      </p>
                    )}
                    {p.analysis?.bodyType && (
                      <p className="font-sans text-xs text-muted mt-0.5">
                        {p.analysis.bodyType}
                        {p.analysis.bodyFatRange ? ` · ${p.analysis.bodyFatRange}` : ''}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(p.id)}
                      className="mt-2 font-sans text-xs text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
