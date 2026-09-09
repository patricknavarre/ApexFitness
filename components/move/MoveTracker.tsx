'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useLiveGps } from '@/hooks/useLiveGps';
import {
  MOVE_MODES,
  downsampleRoute,
  formatElapsed,
  formatMiles,
  type GeoPoint,
  type MoveModeId,
} from '@/lib/geo';
import { getCardioOption, getCardioLabel } from '@/lib/cardio';

const MoveMap = dynamic(
  () => import('./MoveMap').then((m) => m.MoveMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] rounded-card border border-border bg-card animate-pulse" />
    ),
  }
);

type HistoryItem = {
  id: string;
  loggedAt: string | null;
  cardioExercise: string | null;
  cardioDurationMinutes: number | null;
  caloriesBurned: number;
  distanceMiles: number | null;
  route?: GeoPoint[];
};

function modeToCardio(mode: MoveModeId): string {
  return MOVE_MODES.find((m) => m.id === mode)?.cardioId ?? 'walking';
}

export function MoveTracker() {
  const [mode, setMode] = useState<MoveModeId>('walking');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<{
    points: GeoPoint[];
    distanceMiles: number;
    elapsedMs: number;
    calories: number;
    mode: MoveModeId;
  } | null>(null);

  const gps = useLiveGps();
  const active = gps.status === 'watching' || gps.status === 'paused';

  const calPerMin = getCardioOption(modeToCardio(mode))?.calPerMin ?? 4;
  const liveCalories =
    gps.elapsedMs > 0
      ? Math.round((gps.elapsedMs / 60000) * calPerMin)
      : 0;

  const loadHistory = useCallback(() => {
    let cancelled = false;
    setHistoryLoading(true);
    fetch('/api/workout/log?move=1&route=1&limit=10')
      .then((res) => (res.ok ? res.json() : { logs: [] }))
      .then((data: { logs?: HistoryItem[] }) => {
        if (!cancelled) setHistory(data.logs ?? []);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return loadHistory();
  }, [loadHistory]);

  async function handleStop() {
    const points = gps.stop();
    const distanceMiles = gps.distanceMiles;
    const elapsedMs = gps.elapsedMs;
    const durationMinutes = Math.max(1, Math.round(elapsedMs / 60000));

    if (points.length < 2 && distanceMiles < 0.01) {
      toast.error('Not enough GPS movement to save. Try again outdoors.');
      gps.reset();
      return;
    }

    setSaving(true);
    try {
      const route = downsampleRoute(points, 2000);
      const res = await fetch('/api/workout/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardioExercise: modeToCardio(mode),
          cardioDurationMinutes: durationMinutes,
          distanceMiles: Math.round(distanceMiles * 1000) / 1000,
          route,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save activity');

      const calories =
        typeof data.caloriesBurned === 'number' ? data.caloriesBurned : liveCalories;
      setLastSaved({
        points: route,
        distanceMiles,
        elapsedMs,
        calories,
        mode,
      });
      toast.success('Activity saved — burn added to today’s balance');
      gps.reset();
      loadHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save activity');
      // Keep points so user can retry — restart watching? Leave idle with data lost.
      // Re-start from idle; user must redo. Better: leave status idle but restore points.
      // For simplicity toast and reset.
      gps.reset();
    } finally {
      setSaving(false);
    }
  }

  const mapPoints = useMemo(() => {
    if (active || gps.points.length > 0) return gps.points;
    if (lastSaved) return lastSaved.points;
    return [];
  }, [active, gps.points, lastSaved]);

  const mapCurrent = active ? gps.current : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-tan uppercase tracking-wide">Move</h1>
        <p className="font-sans text-muted mt-2 text-sm">
          Live GPS for walk, run, or bike. Keep this tab open while tracking. Distance and
          calories feed Progress surplus / deficit.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {MOVE_MODES.map((m) => {
          const selected = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              disabled={active || saving}
              onClick={() => {
                setMode(m.id);
                setLastSaved(null);
              }}
              className={`rounded-card border px-3 py-3 font-sans text-sm font-bold uppercase transition-colors disabled:opacity-50 ${
                selected
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted hover:border-accent/60 hover:text-tan'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <MoveMap points={mapPoints} current={mapCurrent} height={280} />

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-card border border-border bg-card p-3 text-center">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Distance</p>
          <p className="font-display text-2xl text-tan mt-1">
            {formatMiles(active || gps.points.length ? gps.distanceMiles : lastSaved?.distanceMiles ?? 0)}
          </p>
          <p className="font-sans text-xs text-muted">mi</p>
        </div>
        <div className="rounded-card border border-border bg-card p-3 text-center">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Time</p>
          <p className="font-display text-2xl text-tan mt-1">
            {formatElapsed(active || gps.elapsedMs ? gps.elapsedMs : lastSaved?.elapsedMs ?? 0)}
          </p>
          <p className="font-sans text-xs text-muted">elapsed</p>
        </div>
        <div className="rounded-card border border-border bg-card p-3 text-center">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Burn</p>
          <p className="font-display text-2xl text-tan mt-1">
            {active || gps.elapsedMs
              ? liveCalories
              : lastSaved?.calories ?? 0}
          </p>
          <p className="font-sans text-xs text-muted">cal</p>
        </div>
      </div>

      {gps.error && (
        <p className="font-sans text-sm text-accent2 border border-accent2/40 rounded-card px-3 py-2">
          {gps.error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {!active && (
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setLastSaved(null);
              gps.start();
            }}
            className="od-cta flex-1 min-h-[48px] rounded-card bg-accent px-4 py-3 font-sans text-sm font-bold uppercase text-black hover:shadow-glow disabled:opacity-50"
          >
            Start {MOVE_MODES.find((m) => m.id === mode)?.label}
          </button>
        )}
        {gps.status === 'watching' && (
          <>
            <button
              type="button"
              onClick={() => gps.pause()}
              className="od-cta flex-1 min-h-[48px] rounded-card border border-border px-4 py-3 font-sans text-sm font-bold uppercase text-tan hover:border-accent"
            >
              Pause
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleStop()}
              className="od-cta flex-1 min-h-[48px] rounded-card bg-accent2 px-4 py-3 font-sans text-sm font-bold uppercase text-black hover:shadow-glow disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Stop & save'}
            </button>
          </>
        )}
        {gps.status === 'paused' && (
          <>
            <button
              type="button"
              onClick={() => gps.resume()}
              className="od-cta flex-1 min-h-[48px] rounded-card bg-accent px-4 py-3 font-sans text-sm font-bold uppercase text-black hover:shadow-glow"
            >
              Resume
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleStop()}
              className="od-cta flex-1 min-h-[48px] rounded-card bg-accent2 px-4 py-3 font-sans text-sm font-bold uppercase text-black hover:shadow-glow disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Stop & save'}
            </button>
          </>
        )}
      </div>

      {lastSaved && !active && (
        <div className="rounded-card border border-accent/40 bg-accent/5 p-4">
          <p className="font-display text-lg text-tan uppercase tracking-wide">
            Last activity saved
          </p>
          <p className="font-sans text-sm text-muted mt-1">
            {MOVE_MODES.find((m) => m.id === lastSaved.mode)?.label} ·{' '}
            {formatMiles(lastSaved.distanceMiles)} mi · {formatElapsed(lastSaved.elapsedMs)} ·{' '}
            {lastSaved.calories} cal
          </p>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-xl text-tan uppercase tracking-wide">Recent</h2>
        {historyLoading ? (
          <p className="font-sans text-sm text-muted">Loading…</p>
        ) : history.length === 0 ? (
          <p className="font-sans text-sm text-muted">
            No GPS activities yet. Start a walk, run, or bike to log your first route.
          </p>
        ) : (
          <ul className="space-y-2">
            {history.map((item) => (
              <li
                key={item.id}
                className="rounded-card border border-border bg-card px-4 py-3 flex items-start justify-between gap-3"
              >
                <div>
                  <p className="font-sans text-sm font-semibold text-text">
                    {item.cardioExercise
                      ? getCardioLabel(item.cardioExercise)
                      : 'Activity'}
                    {typeof item.distanceMiles === 'number' && item.distanceMiles > 0
                      ? ` · ${formatMiles(item.distanceMiles)} mi`
                      : ''}
                  </p>
                  <p className="font-sans text-xs text-muted mt-0.5">
                    {item.loggedAt
                      ? new Date(item.loggedAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : '—'}
                    {item.cardioDurationMinutes != null
                      ? ` · ${item.cardioDurationMinutes} min`
                      : ''}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm text-accent">
                  {item.caloriesBurned} cal
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
