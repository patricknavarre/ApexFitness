'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { formatMilesFromMeters } from '@/lib/ride/format';
import {
  RideTelemetryCharts,
  type HrPoint,
} from '@/components/cycling/RideTelemetryCharts';

type RideSummary = {
  id: string;
  loggedAt: string | null;
  durationMinutes: number | null;
  caloriesBurned: number | null;
  avgPowerWatts: number | null;
  normalizedPowerWatts: number | null;
  trainingStressScore: number | null;
  distanceMeters: number | null;
  avgHeartRateBpm: number | null;
  maxHeartRateBpm: number | null;
  elevationGainMeters: number | null;
  courseId: string | null;
};

type RideDetailPayload = {
  id: string;
  hrSeries: HrPoint[];
  courseId: string | null;
  distanceMeters: number | null;
  elevationGainMeters: number | null;
};

export function RecentRides() {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<RideSummary[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<
    Record<string, RideDetailPayload>
  >({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch('/api/workout/ride?limit=10')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load rides');
        return res.json() as Promise<{ rides?: RideSummary[] }>;
      })
      .then((data) => {
        if (!cancelled) setRides(data.rides ?? []);
      })
      .catch(() => {
        if (!cancelled) setRides([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadDetail = useCallback(
    async (id: string) => {
      if (detailCache[id]) return;
      setDetailLoading(id);
      setDetailError(null);
      try {
        const res = await fetch(`/api/workout/ride/${id}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load ride');
        }
        const data = (await res.json()) as RideDetailPayload;
        setDetailCache((prev) => ({
          ...prev,
          [id]: {
            id: data.id,
            hrSeries: Array.isArray(data.hrSeries) ? data.hrSeries : [],
            courseId: data.courseId ?? null,
            distanceMeters: data.distanceMeters ?? null,
            elevationGainMeters: data.elevationGainMeters ?? null,
          },
        }));
      } catch (e) {
        setDetailError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setDetailLoading(null);
      }
    },
    [detailCache]
  );

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetailError(null);
      return;
    }
    setExpandedId(id);
    void loadDetail(id);
  }

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-3 text-left group"
        aria-expanded={open}
      >
        <div>
          <h2 className="font-display text-xl text-tan uppercase tracking-wide mb-1 group-hover:text-accent transition-colors">
            Recent rides
          </h2>
          <p className="font-sans text-muted text-sm">
            {loading
              ? 'Loading…'
              : rides.length > 0
                ? `${rides.length} recent · tap a row for HR & climb charts`
                : 'No rides yet'}
          </p>
        </div>
        <span
          className={`shrink-0 mt-1 font-mono text-sm text-muted transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-4">
          {loading ? (
            <div className="rounded-card border border-border bg-card p-6 font-sans text-muted text-sm">
              Loading…
            </div>
          ) : rides.length === 0 ? (
            <div className="rounded-card border border-border bg-card p-6 font-sans text-muted text-sm">
              No virtual rides yet. Log one from Cycling to see HR and climb charts
              here.
            </div>
          ) : (
            <ul className="space-y-2">
              {rides.map((r) => {
                const expanded = expandedId === r.id;
                const detail = detailCache[r.id];
                const dateLabel = r.loggedAt
                  ? format(new Date(r.loggedAt), 'EEE, MMM d · h:mm a')
                  : '—';
                return (
                  <li
                    key={r.id}
                    className="rounded-card border border-border bg-card overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleExpand(r.id)}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-sm text-muted hover:text-text text-left min-w-0 flex-1"
                        aria-expanded={expanded}
                      >
                        <span
                          className={`font-mono text-xs transition-transform ${
                            expanded ? 'rotate-90' : ''
                          }`}
                          aria-hidden
                        >
                          ▸
                        </span>
                        <span className="text-text">{dateLabel}</span>
                        <span>{r.durationMinutes ?? '—'} min</span>
                        {r.distanceMeters != null && r.distanceMeters > 0 && (
                          <span>{formatMilesFromMeters(r.distanceMeters)}</span>
                        )}
                        {r.avgPowerWatts != null && (
                          <span>avg {r.avgPowerWatts} W</span>
                        )}
                        {r.trainingStressScore != null && (
                          <span>TSS {r.trainingStressScore}</span>
                        )}
                        {r.avgHeartRateBpm != null && (
                          <span>HR {r.avgHeartRateBpm}</span>
                        )}
                        {r.elevationGainMeters != null &&
                          r.elevationGainMeters > 0 && (
                            <span>{Math.round(r.elevationGainMeters)} m elev</span>
                          )}
                      </button>
                      <Link
                        href={`/cycling/${r.id}`}
                        className="font-sans text-xs text-accent underline hover:opacity-90 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open
                      </Link>
                    </div>
                    {expanded && (
                      <div className="border-t border-border px-4 py-4 bg-bg2/40">
                        {detailLoading === r.id && !detail ? (
                          <p className="font-sans text-sm text-muted">
                            Loading charts…
                          </p>
                        ) : detailError && !detail ? (
                          <p className="font-sans text-sm text-accent2">
                            {detailError}
                          </p>
                        ) : detail ? (
                          <RideTelemetryCharts
                            hrSeries={detail.hrSeries}
                            courseId={detail.courseId}
                            distanceMeters={detail.distanceMeters}
                          />
                        ) : null}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
