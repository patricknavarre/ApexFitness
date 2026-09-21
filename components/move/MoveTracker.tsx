'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useLiveGps } from '@/hooks/useLiveGps';
import { useMoveLeaveGuard } from '@/hooks/useMoveLeaveGuard';
import {
  MOVE_MODES,
  avgSpeedMph,
  downsampleRoute,
  formatElapsed,
  formatMiles,
  formatMph,
  formatPaceMinPerMile,
  type GeoPoint,
  type MoveModeId,
} from '@/lib/geo';
import { getCardioOption, getCardioLabel } from '@/lib/cardio';
import {
  connectHeartRateMonitor,
  isWebBluetoothSupported,
  type HrConnection,
} from '@/lib/ble/hr-client';
import { startMockHeartRate } from '@/lib/ble/mock-trainer';
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
  avgHeartRateBpm?: number | null;
  maxHeartRateBpm?: number | null;
  hrDeviceName?: string | null;
  route?: GeoPoint[];
};

function modeToCardio(mode: MoveModeId): string {
  return MOVE_MODES.find((m) => m.id === mode)?.cardioId ?? 'walking';
}

function IconClose() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function MoveTracker() {
  const [mode, setMode] = useState<MoveModeId>('walking');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [bleOk, setBleOk] = useState(false);
  const [hrBpm, setHrBpm] = useState<number | null>(null);
  const [hrDeviceName, setHrDeviceName] = useState<string | null>(null);
  const [hrAvg, setHrAvg] = useState(0);
  const [hrMax, setHrMax] = useState(0);
  const [lastSaved, setLastSaved] = useState<{
    points: GeoPoint[];
    distanceMiles: number;
    elapsedMs: number;
    calories: number;
    avgMph: number;
    mode: MoveModeId;
    avgHeartRateBpm?: number;
    maxHeartRateBpm?: number;
  } | null>(null);

  const hrConnectionRef = useRef<HrConnection | { disconnect: () => void } | null>(null);
  const hrSumRef = useRef(0);
  const hrCountRef = useRef(0);
  const hrMaxRef = useRef(0);
  const sessionActiveRef = useRef(false);

  const gps = useLiveGps();
  const active = gps.status === 'watching' || gps.status === 'paused';
  sessionActiveRef.current = active;

  useEffect(() => {
    setBleOk(isWebBluetoothSupported());
    return () => {
      hrConnectionRef.current?.disconnect();
      hrConnectionRef.current = null;
    };
  }, []);

  const onHrSample = useCallback((bpm: number) => {
    setHrBpm(bpm);
    if (!sessionActiveRef.current) return;
    hrSumRef.current += bpm;
    hrCountRef.current += 1;
    if (bpm > hrMaxRef.current) hrMaxRef.current = bpm;
    setHrAvg(hrSumRef.current / hrCountRef.current);
    setHrMax(hrMaxRef.current);
  }, []);

  function resetHrAccumulators() {
    hrSumRef.current = 0;
    hrCountRef.current = 0;
    hrMaxRef.current = 0;
    setHrAvg(0);
    setHrMax(0);
  }

  async function handleConnectHr() {
    try {
      hrConnectionRef.current?.disconnect();
      const conn = await connectHeartRateMonitor(onHrSample, () => {
        toast.error('Heart rate disconnected');
        setHrDeviceName(null);
        hrConnectionRef.current = null;
      });
      hrConnectionRef.current = conn;
      setHrDeviceName(conn.deviceName);
      toast.success(`HR: ${conn.deviceName}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not connect HR';
      if (!/cancel|chooser/i.test(msg)) toast.error(msg);
    }
  }

  function handleMockHr() {
    hrConnectionRef.current?.disconnect();
    const conn = startMockHeartRate(onHrSample);
    hrConnectionRef.current = conn;
    setHrDeviceName(conn.deviceName);
    toast.success('Mock HR connected');
  }

  function handleDisconnectHr() {
    hrConnectionRef.current?.disconnect();
    hrConnectionRef.current = null;
    setHrDeviceName(null);
    setHrBpm(null);
  }
  const calPerMin = getCardioOption(modeToCardio(mode))?.calPerMin ?? 4;
  const liveCalories =
    gps.elapsedMs > 0
      ? Math.round((gps.elapsedMs / 60000) * calPerMin)
      : 0;

  const liveAvgMph = avgSpeedMph(gps.distanceMiles, gps.elapsedMs);
  const displayDistance =
    active || gps.points.length
      ? gps.distanceMiles
      : lastSaved?.distanceMiles ?? 0;
  const displayElapsed =
    active || gps.elapsedMs ? gps.elapsedMs : lastSaved?.elapsedMs ?? 0;
  const displaySpeedMph = active
    ? gps.status === 'paused'
      ? 0
      : gps.speedMph
    : 0;
  const displayAvgMph =
    active || gps.points.length ? liveAvgMph : lastSaved?.avgMph ?? 0;
  const pace =
    mode !== 'cycling'
      ? formatPaceMinPerMile(active ? displaySpeedMph || displayAvgMph : displayAvgMph)
      : null;

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

  const persistSession = useCallback(async (): Promise<boolean> => {
    const points = gps.stop();
    const distanceMiles = gps.distanceMiles;
    const elapsedMs = gps.elapsedMs;
    const durationMinutes = Math.max(1, Math.round(elapsedMs / 60000));
    const avgHeartRateBpm =
      hrCountRef.current > 0 ? Math.round(hrSumRef.current / hrCountRef.current) : undefined;
    const maxHeartRateBpm = hrMaxRef.current > 0 ? Math.round(hrMaxRef.current) : undefined;

    if (points.length < 2 && distanceMiles < 0.01) {
      toast.error('Not enough GPS movement to save. Try again outdoors.');
      gps.reset();
      resetHrAccumulators();
      return false;
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
          ...(avgHeartRateBpm != null ? { avgHeartRateBpm } : {}),
          ...(maxHeartRateBpm != null ? { maxHeartRateBpm } : {}),
          ...(hrDeviceName ? { hrDeviceName } : {}),
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
        avgMph: avgSpeedMph(distanceMiles, elapsedMs),
        mode,
        avgHeartRateBpm:
          typeof data.avgHeartRateBpm === 'number'
            ? data.avgHeartRateBpm
            : avgHeartRateBpm,
        maxHeartRateBpm:
          typeof data.maxHeartRateBpm === 'number'
            ? data.maxHeartRateBpm
            : maxHeartRateBpm,
      });
      toast.success('Activity saved — burn added to today’s balance');
      gps.reset();
      resetHrAccumulators();
      loadHistory();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save activity');
      gps.reset();
      resetHrAccumulators();
      return false;
    } finally {
      setSaving(false);
    }
  }, [gps, hrDeviceName, liveCalories, loadHistory, mode]);

  const discardSession = useCallback(() => {
    gps.reset();
    resetHrAccumulators();
    toast.message('Activity discarded');
  }, [gps]);

  const leaveGuard = useMoveLeaveGuard({
    active,
    save: persistSession,
    discard: discardSession,
  });

  async function handleStop() {
    await persistSession();
  }

  const mapPoints = useMemo(() => {
    if (active || gps.points.length > 0) return gps.points;
    if (lastSaved) return lastSaved.points;
    return [];
  }, [active, gps.points, lastSaved]);

  const mapCurrent = active ? gps.current : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-tan uppercase tracking-wide">Move</h1>
          <p className="font-sans text-muted mt-2 text-sm">
            Live GPS for walk, run, or bike. Connect an Amazfit / HR strap before you start —
            heart rate saves with the activity.
          </p>
        </div>
        <button
          type="button"
          aria-label={active ? 'End activity' : 'Close Move'}
          onClick={() => leaveGuard.requestLeave('/dashboard')}
          className="shrink-0 mt-1 rounded-full border border-border p-2 text-muted hover:text-tan hover:border-accent/50 transition-colors"
        >
          <IconClose />
        </button>
      </div>

      <section className="rounded-card border border-border bg-card p-4 space-y-3">
        <h2 className="font-display text-lg text-tan uppercase tracking-wide">Heart rate</h2>
        {!bleOk && (
          <p className="font-sans text-xs text-muted">
            Web Bluetooth needs Chrome or Edge (desktop/Android). Safari/iOS can’t pair HR in
            the browser — use Mock HR to preview, or track without it.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {!hrDeviceName ? (
            <>
              <button
                type="button"
                onClick={() => void handleConnectHr()}
                disabled={!bleOk || saving}
                className="font-sans text-sm px-4 py-2 rounded-card border border-accent text-accent hover:bg-bg2 disabled:opacity-40"
              >
                Connect HR
              </button>
              <button
                type="button"
                onClick={handleMockHr}
                disabled={saving}
                className="font-sans text-sm px-4 py-2 rounded-card border border-border text-tan hover:bg-bg2"
              >
                Mock HR
              </button>
            </>
          ) : (
            <>
              <span className="font-sans text-sm text-muted">
                {hrDeviceName}
                {hrBpm != null ? ` · ${Math.round(hrBpm)} bpm` : ' · waiting…'}
              </span>
              <button
                type="button"
                onClick={handleDisconnectHr}
                className="font-sans text-xs px-3 py-1.5 rounded-card border border-border text-muted hover:text-tan"
              >
                Disconnect
              </button>
            </>
          )}
        </div>
        <p className="font-sans text-xs text-muted">
          Amazfit: enable Heart Rate Push, then Connect HR before starting your walk/run/bike.
        </p>
      </section>

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-card border border-border bg-card p-3 text-center">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Distance</p>
          <p className="font-display text-2xl text-tan mt-1">{formatMiles(displayDistance)}</p>
          <p className="font-sans text-xs text-muted">mi</p>
        </div>
        <div className="rounded-card border border-border bg-card p-3 text-center">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Time</p>
          <p className="font-display text-2xl text-tan mt-1">{formatElapsed(displayElapsed)}</p>
          <p className="font-sans text-xs text-muted">elapsed</p>
        </div>
        <div className="rounded-card border border-border bg-card p-3 text-center">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
            {active ? 'Speed' : 'Avg speed'}
          </p>
          <p className="font-display text-2xl text-tan mt-1">
            {formatMph(active ? displaySpeedMph : displayAvgMph)}
          </p>
          <p className="font-sans text-xs text-muted">
            {active ? `mph · avg ${formatMph(displayAvgMph)}` : 'mph'}
            {pace ? ` · ${pace}/mi` : ''}
          </p>
        </div>
        <div className="rounded-card border border-border bg-card p-3 text-center">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Heart rate</p>
          <p className="font-display text-2xl text-tan mt-1">
            {active
              ? hrBpm != null
                ? Math.round(hrBpm)
                : '—'
              : lastSaved?.avgHeartRateBpm != null
                ? Math.round(lastSaved.avgHeartRateBpm)
                : hrBpm != null
                  ? Math.round(hrBpm)
                  : '—'}
          </p>
          <p className="font-sans text-xs text-muted">
            {active && hrMax > 0
              ? `bpm · avg ${Math.round(hrAvg)} · max ${Math.round(hrMax)}`
              : lastSaved?.maxHeartRateBpm != null
                ? `avg · max ${Math.round(lastSaved.maxHeartRateBpm)}`
                : 'bpm'}
          </p>
        </div>
        <div className="rounded-card border border-border bg-card p-3 text-center">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Burn</p>
          <p className="font-display text-2xl text-tan mt-1">
            {active || gps.elapsedMs ? liveCalories : lastSaved?.calories ?? 0}
          </p>
          <p className="font-sans text-xs text-muted">cal</p>
        </div>
      </div>

      {active && (
        <p className="font-sans text-xs text-muted border border-border/80 rounded-card px-3 py-2 bg-card/60">
          Tracking in progress — closing this tab or window will ask you to confirm. Use Stop &amp;
          save or the ✕ to keep, save, or discard your route.
        </p>
      )}

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
              resetHrAccumulators();
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
            avg {formatMph(lastSaved.avgMph)} mph · {lastSaved.calories} cal
            {lastSaved.avgHeartRateBpm != null
              ? ` · avg HR ${lastSaved.avgHeartRateBpm}${
                  lastSaved.maxHeartRateBpm != null
                    ? ` / max ${lastSaved.maxHeartRateBpm}`
                    : ''
                }`
              : ''}
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
                    {typeof item.distanceMiles === 'number' &&
                    item.distanceMiles > 0 &&
                    item.cardioDurationMinutes != null &&
                    item.cardioDurationMinutes > 0
                      ? ` · avg ${formatMph(
                          avgSpeedMph(item.distanceMiles, item.cardioDurationMinutes * 60_000)
                        )} mph`
                      : ''}
                    {item.avgHeartRateBpm != null
                      ? ` · HR ${item.avgHeartRateBpm}${
                          item.maxHeartRateBpm != null ? `/${item.maxHeartRateBpm}` : ''
                        }`
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
