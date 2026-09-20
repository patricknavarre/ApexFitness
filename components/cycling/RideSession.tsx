'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { isWebBluetoothSupported, connectTrainer } from '@/lib/ble/trainer-client';
import { startMockTrainer } from '@/lib/ble/mock-trainer';
import type { IndoorBikeSample } from '@/lib/ble/parse-indoor-bike';
import type { TrainerConnection } from '@/lib/ble/trainer-client';

type Phase = 'idle' | 'connected' | 'riding' | 'saving';

type RideSummary = {
  id: string;
  durationMinutes: number | null;
  caloriesBurned: number | null;
  avgPowerWatts: number | null;
  maxPowerWatts: number | null;
  avgCadenceRpm: number | null;
  distanceMeters: number | null;
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export function RideSession() {
  const [bleOk, setBleOk] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [rideSource, setRideSource] = useState<'ftms' | 'cps' | 'mock' | null>(null);
  const [live, setLive] = useState<IndoorBikeSample>({});
  const [elapsedSec, setElapsedSec] = useState(0);
  const [distanceM, setDistanceM] = useState(0);
  const [lastSaved, setLastSaved] = useState<RideSummary | null>(null);
  const [recent, setRecent] = useState<RideSummary[]>([]);

  const connectionRef = useRef<TrainerConnection | null>(null);
  const powerSumRef = useRef(0);
  const powerCountRef = useRef(0);
  const maxPowerRef = useRef(0);
  const cadenceSumRef = useRef(0);
  const cadenceCountRef = useRef(0);
  const energyRef = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const lastSpeedRef = useRef(0);
  const rideStartRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setBleOk(isWebBluetoothSupported());
    void loadRecent();
    return () => {
      stopTimer();
      connectionRef.current?.disconnect();
      connectionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRecent() {
    try {
      const res = await fetch('/api/workout/ride?limit=5');
      if (!res.ok) return;
      const data = await res.json();
      setRecent(
        (data.rides ?? []).map((r: RideSummary & { id: string }) => ({
          id: r.id,
          durationMinutes: r.durationMinutes,
          caloriesBurned: r.caloriesBurned,
          avgPowerWatts: r.avgPowerWatts,
          maxPowerWatts: r.maxPowerWatts,
          avgCadenceRpm: r.avgCadenceRpm,
          distanceMeters: r.distanceMeters,
        }))
      );
    } catch {
      /* ignore */
    }
  }

  function stopTimer() {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function resetAccumulators() {
    powerSumRef.current = 0;
    powerCountRef.current = 0;
    maxPowerRef.current = 0;
    cadenceSumRef.current = 0;
    cadenceCountRef.current = 0;
    energyRef.current = null;
    distanceRef.current = 0;
    lastTickRef.current = null;
    lastSpeedRef.current = 0;
    rideStartRef.current = null;
    setElapsedSec(0);
    setDistanceM(0);
    setLive({});
  }

  const onMetrics = useCallback((sample: IndoorBikeSample) => {
    setLive((prev) => ({ ...prev, ...sample }));

    if (typeof sample.powerWatts === 'number' && sample.powerWatts >= 0) {
      powerSumRef.current += sample.powerWatts;
      powerCountRef.current += 1;
      if (sample.powerWatts > maxPowerRef.current) {
        maxPowerRef.current = sample.powerWatts;
      }
    }
    if (typeof sample.cadenceRpm === 'number' && sample.cadenceRpm >= 0) {
      cadenceSumRef.current += sample.cadenceRpm;
      cadenceCountRef.current += 1;
    }
    if (typeof sample.energyKcal === 'number') {
      energyRef.current = sample.energyKcal;
    }

    const now = performance.now();
    if (typeof sample.distanceMeters === 'number' && sample.distanceMeters >= 0) {
      distanceRef.current = sample.distanceMeters;
      setDistanceM(sample.distanceMeters);
    } else if (typeof sample.speedKmh === 'number' && sample.speedKmh >= 0) {
      const speedMs = sample.speedKmh / 3.6;
      if (lastTickRef.current != null) {
        const dt = (now - lastTickRef.current) / 1000;
        if (dt > 0 && dt < 5) {
          distanceRef.current += speedMs * dt;
          setDistanceM(distanceRef.current);
        }
      }
      lastSpeedRef.current = speedMs;
    }
    lastTickRef.current = now;
  }, []);

  async function attachConnection(conn: TrainerConnection) {
    connectionRef.current?.disconnect();
    connectionRef.current = conn;
    setDeviceName(conn.deviceName);
    setRideSource(conn.source);
    setPhase('connected');
    resetAccumulators();
    toast.success(`Connected to ${conn.deviceName}`);
  }

  async function handleConnect() {
    try {
      const conn = await connectTrainer(onMetrics, () => {
        toast.error('Trainer disconnected');
        stopTimer();
        setPhase('idle');
        setDeviceName(null);
        connectionRef.current = null;
      });
      await attachConnection(conn);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not connect';
      if (!/cancel|chooser/i.test(msg)) {
        toast.error(msg);
      }
    }
  }

  function handleMock() {
    const conn = startMockTrainer(onMetrics);
    void attachConnection(conn);
  }

  function handleStartRide() {
    if (!connectionRef.current) return;
    resetAccumulators();
    rideStartRef.current = Date.now();
    setPhase('riding');
    stopTimer();
    timerRef.current = window.setInterval(() => {
      if (rideStartRef.current == null) return;
      setElapsedSec(Math.floor((Date.now() - rideStartRef.current) / 1000));
    }, 250);
  }

  async function handleEndRide() {
    stopTimer();
    const durationSeconds = Math.max(
      0,
      rideStartRef.current != null
        ? Math.floor((Date.now() - rideStartRef.current) / 1000)
        : elapsedSec
    );

    if (durationSeconds < 15) {
      toast.error('Ride a bit longer (15s+) before saving');
      setPhase('connected');
      return;
    }

    setPhase('saving');
    const avgPower =
      powerCountRef.current > 0
        ? powerSumRef.current / powerCountRef.current
        : undefined;
    const avgCadence =
      cadenceCountRef.current > 0
        ? cadenceSumRef.current / cadenceCountRef.current
        : undefined;

    try {
      const res = await fetch('/api/workout/ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationSeconds,
          avgPowerWatts: avgPower,
          maxPowerWatts: maxPowerRef.current || undefined,
          avgCadenceRpm: avgCadence,
          distanceMeters: distanceRef.current || undefined,
          energyKcal: energyRef.current ?? undefined,
          deviceName: deviceName ?? undefined,
          rideSource: rideSource ?? 'ftms',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }
      const data = await res.json();
      setLastSaved({
        id: data.id,
        durationMinutes: data.durationMinutes,
        caloriesBurned: data.caloriesBurned,
        avgPowerWatts: data.avgPowerWatts,
        maxPowerWatts: data.maxPowerWatts,
        avgCadenceRpm: data.avgCadenceRpm,
        distanceMeters: data.distanceMeters,
      });
      toast.success('Ride saved');
      await loadRecent();
      setPhase('connected');
      resetAccumulators();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save ride');
      setPhase('riding');
      rideStartRef.current = Date.now() - durationSeconds * 1000;
      timerRef.current = window.setInterval(() => {
        if (rideStartRef.current == null) return;
        setElapsedSec(Math.floor((Date.now() - rideStartRef.current) / 1000));
      }, 250);
    }
  }

  function handleDisconnect() {
    stopTimer();
    connectionRef.current?.disconnect();
    connectionRef.current = null;
    setDeviceName(null);
    setRideSource(null);
    setPhase('idle');
    resetAccumulators();
  }

  const power = live.powerWatts ?? 0;
  const cadence = live.cadenceRpm ?? 0;
  const speed = live.speedKmh ?? 0;
  const hr = live.heartRateBpm;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl text-accent uppercase tracking-wide">
          Virtual ride
        </h1>
        <p className="font-sans text-sm text-muted mt-1">
          Connect a smart trainer over Bluetooth, ride live, and save to your Apex log.
        </p>
      </div>

      {!bleOk && (
        <div className="rounded-card border border-border bg-bg2 px-4 py-3 font-sans text-sm text-muted">
          Web Bluetooth is not available here (Safari / iOS cannot pair trainers in the
          browser). Use Chrome or Edge on desktop or Android — or try the mock trainer to
          preview the ride HUD.
        </div>
      )}

      <section className="rounded-card border border-border bg-card p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {phase === 'idle' && (
            <>
              <button
                type="button"
                onClick={handleConnect}
                disabled={!bleOk}
                className="font-sans text-sm px-4 py-2 rounded-card bg-accent text-bg font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                Connect trainer
              </button>
              <button
                type="button"
                onClick={handleMock}
                className="font-sans text-sm px-4 py-2 rounded-card border border-border text-text hover:bg-bg2 transition-colors"
              >
                Use mock trainer
              </button>
            </>
          )}
          {(phase === 'connected' || phase === 'riding' || phase === 'saving') && (
            <>
              <span className="font-sans text-sm text-muted">
                {deviceName}
                {rideSource ? ` · ${rideSource.toUpperCase()}` : ''}
              </span>
              {phase === 'connected' && (
                <button
                  type="button"
                  onClick={handleStartRide}
                  className="font-sans text-sm px-4 py-2 rounded-card bg-accent text-bg font-medium hover:opacity-90 transition-opacity"
                >
                  Start ride
                </button>
              )}
              {phase === 'riding' && (
                <button
                  type="button"
                  onClick={handleEndRide}
                  className="font-sans text-sm px-4 py-2 rounded-card bg-accent text-bg font-medium hover:opacity-90 transition-opacity"
                >
                  End & save
                </button>
              )}
              {phase === 'saving' && (
                <span className="font-sans text-sm text-muted">Saving…</span>
              )}
              {phase !== 'saving' && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="font-sans text-sm px-4 py-2 rounded-card border border-border text-muted hover:text-text hover:bg-bg2 transition-colors"
                >
                  Disconnect
                </button>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Power" value={`${Math.round(power)}`} unit="W" large />
          <Metric label="Cadence" value={`${Math.round(cadence)}`} unit="rpm" large />
          <Metric label="Speed" value={speed.toFixed(1)} unit="km/h" large />
          <Metric
            label="Time"
            value={formatDuration(elapsedSec)}
            unit={hr != null ? `HR ${hr}` : ''}
            large
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Metric label="Distance" value={formatDistance(distanceM)} unit="" />
          <Metric
            label="Energy"
            value={live.energyKcal != null ? String(live.energyKcal) : '—'}
            unit={live.energyKcal != null ? 'kcal' : ''}
          />
        </div>
      </section>

      {lastSaved && (
        <section className="rounded-card border border-border bg-bg2 px-4 py-3 font-sans text-sm text-muted">
          Last saved: {lastSaved.durationMinutes} min
          {lastSaved.avgPowerWatts != null ? ` · avg ${lastSaved.avgPowerWatts} W` : ''}
          {lastSaved.caloriesBurned != null ? ` · ${lastSaved.caloriesBurned} kcal` : ''}
          {lastSaved.distanceMeters != null
            ? ` · ${formatDistance(lastSaved.distanceMeters)}`
            : ''}
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="font-display text-xl text-accent uppercase tracking-wide mb-3">
            Recent rides
          </h2>
          <ul className="space-y-2">
            {recent.map((r) => (
              <li
                key={r.id}
                className="rounded-card border border-border bg-card px-4 py-3 font-sans text-sm text-muted flex flex-wrap gap-x-3 gap-y-1"
              >
                <span>{r.durationMinutes ?? '—'} min</span>
                {r.avgPowerWatts != null && <span>avg {r.avgPowerWatts} W</span>}
                {r.maxPowerWatts != null && <span>max {r.maxPowerWatts} W</span>}
                {r.avgCadenceRpm != null && <span>{r.avgCadenceRpm} rpm</span>}
                {r.distanceMeters != null && (
                  <span>{formatDistance(r.distanceMeters)}</span>
                )}
                {r.caloriesBurned != null && <span>{r.caloriesBurned} kcal</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  large,
}: {
  label: string;
  value: string;
  unit: string;
  large?: boolean;
}) {
  return (
    <div className="rounded-card bg-bg2 border border-border px-3 py-3">
      <p className="font-sans text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p
        className={`font-mono text-text mt-1 ${large ? 'text-2xl md:text-3xl' : 'text-lg'}`}
      >
        {value}
        {unit ? (
          <span className="font-sans text-xs text-muted ml-1">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}
