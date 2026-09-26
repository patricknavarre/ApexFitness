'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  elevationProfile,
  getRideCourse,
} from '@/lib/ride/courses';

export type HrPoint = { t: number; bpm: number };

function formatAxisTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatAxisKm(meters: number): string {
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)}`;
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="h-44 rounded-card border border-border bg-card flex items-center justify-center font-sans text-sm text-muted px-4 text-center">
      {message}
    </div>
  );
}

export function RideHrChart({ series }: { series: HrPoint[] }) {
  if (series.length < 2) {
    return <ChartEmpty message="No heart-rate series for this ride" />;
  }

  return (
    <div className="h-44 rounded-card border border-border bg-card px-2 pt-3 pb-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series}>
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
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              fontSize: 12,
            }}
            labelFormatter={(v) => formatAxisTime(Number(v))}
            formatter={(value: number) => [`${Math.round(value)} bpm`, 'HR']}
          />
          <Area
            type="monotone"
            dataKey="bpm"
            stroke="var(--accent2, #c45c4a)"
            fill="var(--accent2, #c45c4a)"
            fillOpacity={0.2}
            strokeWidth={2}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RideElevChart({
  courseId,
  distanceMeters,
}: {
  courseId: string | null | undefined;
  distanceMeters?: number | null;
}) {
  const course = getRideCourse(courseId);
  if (!course) {
    return <ChartEmpty message="No course elevation profile for this ride" />;
  }

  const full = elevationProfile(course, 80);
  const ridden =
    typeof distanceMeters === 'number' && distanceMeters > 0
      ? Math.min(distanceMeters, course.lengthMeters)
      : course.lengthMeters;
  const data = full.filter((p) => p.d <= ridden + 1);
  if (data.length < 2) {
    return <ChartEmpty message="No course elevation profile for this ride" />;
  }

  return (
    <div className="h-44 rounded-card border border-border bg-card px-2 pt-3 pb-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="d"
            tickFormatter={formatAxisKm}
            tick={{ fontSize: 11, fill: 'var(--muted)' }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
            minTickGap={40}
            unit=" km"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--muted)' }}
            axisLine={false}
            tickLine={false}
            width={36}
            unit=" m"
          />
          <Tooltip
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              fontSize: 12,
            }}
            labelFormatter={(v) => `${(Number(v) / 1000).toFixed(2)} km`}
            formatter={(value: number) => [
              `${Math.round(value)} m`,
              'Elevation',
            ]}
          />
          <Area
            type="monotone"
            dataKey="elev"
            stroke="var(--accent3, #8a9a5b)"
            fill="var(--accent3, #8a9a5b)"
            fillOpacity={0.25}
            strokeWidth={2}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** HR + elevation charts for ride expand panels / detail. */
export function RideTelemetryCharts({
  hrSeries,
  courseId,
  distanceMeters,
}: {
  hrSeries: HrPoint[];
  courseId?: string | null;
  distanceMeters?: number | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <h3 className="font-display text-sm text-accent uppercase tracking-wide">
          Heart rate
        </h3>
        <RideHrChart series={hrSeries} />
      </div>
      <div className="space-y-2">
        <h3 className="font-display text-sm text-accent uppercase tracking-wide">
          Elevation / climb
        </h3>
        <RideElevChart courseId={courseId} distanceMeters={distanceMeters} />
      </div>
    </div>
  );
}
