'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMilesFromMeters } from '@/lib/ride/format';

type PowerPoint = { t: number; w: number };

type Lap = {
  index: number | null;
  elapsedSec: number | null;
  durationSec: number | null;
  distanceMeters: number | null;
  avgPowerWatts: number | null;
  avgHeartRateBpm: number | null;
};

type RideDetailData = {
  id: string;
  loggedAt: string | null;
  durationMinutes: number | null;
  movingSeconds: number | null;
  pausedSeconds: number | null;
  caloriesBurned: number | null;
  avgPowerWatts: number | null;
  maxPowerWatts: number | null;
  normalizedPowerWatts: number | null;
  trainingStressScore: number | null;
  workKj: number | null;
  avgHeartRateBpm: number | null;
  maxHeartRateBpm: number | null;
  distanceMeters: number | null;
  elevationGainMeters: number | null;
  courseName: string | null;
  courseCompleted: boolean;
  workoutName: string | null;
  workoutCompleted: boolean;
  powerSeries: PowerPoint[];
  laps: Lap[];
};

function formatClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
  }
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function formatAxisTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[5.5rem]">
      <p className="font-sans text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="font-mono text-lg text-text tabular-nums">{value}</p>
    </div>
  );
}

export function RideDetail({ rideId }: { rideId: string }) {
  const [ride, setRide] = useState<RideDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetch(`/api/workout/ride/${rideId}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load ride');
        }
        return res.json() as Promise<RideDetailData>;
      })
      .then((data) => {
        if (!cancelled) setRide(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rideId]);

  if (loading) {
    return (
      <div className="font-sans text-sm text-muted py-8">Loading ride…</div>
    );
  }

  if (error || !ride) {
    return (
      <div className="space-y-4 py-8">
        <p className="font-sans text-sm text-accent2">{error ?? 'Ride not found'}</p>
        <Link
          href="/cycling"
          className="font-sans text-sm text-accent underline hover:opacity-90"
        >
          Back to cycling
        </Link>
      </div>
    );
  }

  const movingSec =
    ride.movingSeconds ??
    (ride.durationMinutes != null ? Math.round(ride.durationMinutes * 60) : 0);
  const pausedSec = ride.pausedSeconds ?? 0;
  const dateLabel = ride.loggedAt
    ? format(new Date(ride.loggedAt), 'EEE, MMM d · h:mm a')
    : 'Unknown date';

  const contextParts: string[] = [];
  if (ride.courseName) {
    contextParts.push(
      ride.courseCompleted ? `${ride.courseName} · completed` : ride.courseName
    );
  }
  if (ride.workoutName) {
    contextParts.push(
      ride.workoutCompleted ? `${ride.workoutName} · completed` : ride.workoutName
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-2">
        <Link
          href="/cycling"
          className="font-sans text-xs text-muted hover:text-text underline"
        >
          ← Cycling
        </Link>
        <h1 className="font-display text-2xl md:text-3xl text-accent uppercase tracking-wide">
          Ride detail
        </h1>
        <p className="font-sans text-sm text-muted">{dateLabel}</p>
        <p className="font-sans text-sm text-text">
          {formatClock(movingSec)} moving
          {pausedSec > 0 ? ` · ${formatClock(pausedSec)} paused` : ''}
          {ride.distanceMeters != null && ride.distanceMeters > 0
            ? ` · ${formatMilesFromMeters(ride.distanceMeters)}`
            : ''}
          {ride.caloriesBurned != null ? ` · ${ride.caloriesBurned} kcal` : ''}
        </p>
        {contextParts.length > 0 ? (
          <p className="font-sans text-sm text-muted">{contextParts.join(' · ')}</p>
        ) : null}
      </div>

      <section className="flex flex-wrap gap-x-6 gap-y-4">
        <Stat
          label="Avg power"
          value={ride.avgPowerWatts != null ? `${ride.avgPowerWatts} W` : '—'}
        />
        <Stat
          label="Max power"
          value={ride.maxPowerWatts != null ? `${ride.maxPowerWatts} W` : '—'}
        />
        <Stat
          label="NP"
          value={
            ride.normalizedPowerWatts != null
              ? `${ride.normalizedPowerWatts}`
              : '—'
          }
        />
        <Stat
          label="TSS"
          value={
            ride.trainingStressScore != null
              ? `${ride.trainingStressScore}`
              : '—'
          }
        />
        <Stat
          label="Work"
          value={ride.workKj != null ? `${ride.workKj} kJ` : '—'}
        />
        <Stat
          label="Avg HR"
          value={
            ride.avgHeartRateBpm != null ? `${ride.avgHeartRateBpm}` : '—'
          }
        />
        <Stat
          label="Max HR"
          value={
            ride.maxHeartRateBpm != null ? `${ride.maxHeartRateBpm}` : '—'
          }
        />
        <Stat
          label="Elev gain"
          value={
            ride.elevationGainMeters != null && ride.elevationGainMeters > 0
              ? `${Math.round(ride.elevationGainMeters)} m`
              : '—'
          }
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg text-accent uppercase tracking-wide">
          Power
        </h2>
        {ride.powerSeries.length < 2 ? (
          <div className="h-48 rounded-card border border-border bg-card flex items-center justify-center font-sans text-sm text-muted">
            No power series for this ride
          </div>
        ) : (
          <div className="h-56 rounded-card border border-border bg-card px-2 pt-3 pb-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ride.powerSeries}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="t"
                  tickFormatter={formatAxisTime}
                  tick={{ fontSize: 11, fill: 'var(--muted)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted)' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  unit=" W"
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    fontSize: 12,
                  }}
                  labelFormatter={(v) => formatAxisTime(Number(v))}
                  formatter={(value: number) => [
                    `${Math.round(value)} W`,
                    'Power',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="w"
                  stroke="var(--accent)"
                  fill="var(--accent)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {ride.laps.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg text-accent uppercase tracking-wide">
            Laps
          </h2>
          <ul className="space-y-2">
            {ride.laps.map((lap, i) => (
              <li
                key={`${lap.index ?? i}-${lap.elapsedSec ?? i}`}
                className="rounded-card border border-border bg-card px-4 py-3 font-sans text-sm text-muted flex flex-wrap gap-x-4 gap-y-1"
              >
                <span className="text-text font-medium">
                  Lap {lap.index ?? i + 1}
                </span>
                {lap.durationSec != null && (
                  <span>{formatClock(lap.durationSec)}</span>
                )}
                {lap.distanceMeters != null && lap.distanceMeters > 0 && (
                  <span>{formatMilesFromMeters(lap.distanceMeters)}</span>
                )}
                {lap.avgPowerWatts != null && (
                  <span>avg {lap.avgPowerWatts} W</span>
                )}
                {lap.avgHeartRateBpm != null && (
                  <span>HR {lap.avgHeartRateBpm}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
