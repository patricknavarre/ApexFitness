'use client';

import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'apex.ride.hrOverlayExpanded';

type Sample = { t: number; bpm: number };

type Props = {
  samples: Sample[];
  avgHr: number;
  hrBpm: number | null;
  maxHr: number;
  /** Offset below the elevation overlay when a course profile is showing */
  belowElevation?: boolean;
};

function loadExpanded(): boolean {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {
    /* ignore */
  }
  return true;
}

export function HrProfileOverlay({
  samples,
  avgHr,
  hrBpm,
  maxHr,
  belowElevation = false,
}: Props) {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setExpanded(loadExpanded());
  }, []);

  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const { areaD, lineD, peakBpm, hasChart } = useMemo(() => {
    if (samples.length < 2) {
      return { areaD: '', lineD: '', peakBpm: 0, hasChart: false };
    }
    const t0 = samples[0].t;
    const t1 = samples[samples.length - 1].t;
    const span = Math.max(1, t1 - t0);
    const bpms = samples.map((s) => s.bpm);
    const minB = Math.min(...bpms);
    const maxB = Math.max(...bpms);
    const range = Math.max(8, maxB - minB);
    const w = 100;
    const h = 36;
    const padY = 2;
    const pts = samples.map((s) => {
      const x = ((s.t - t0) / span) * w;
      const y = h - padY - ((s.bpm - minB) / range) * (h - padY * 2);
      return { x, y };
    });
    const line = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' ');
    const area = `${line} L${w},${h} L0,${h} Z`;
    return {
      areaD: area,
      lineD: line,
      peakBpm: maxB,
      hasChart: true,
    };
  }, [samples]);

  const avgLabel = avgHr > 0 ? Math.round(avgHr) : '—';
  const liveLabel = hrBpm != null && hrBpm > 0 ? Math.round(hrBpm) : '—';
  const maxLabel = maxHr > 0 ? Math.round(maxHr) : peakBpm > 0 ? Math.round(peakBpm) : '—';

  return (
    <div
      className={`ride-hr-overlay${belowElevation ? ' ride-hr-overlay--below-elev' : ''}${
        expanded ? '' : ' ride-hr-overlay--collapsed'
      }`}
      aria-label="Heart rate profile"
    >
      <button
        type="button"
        className="ride-hr-overlay__toggle"
        onClick={toggle}
        aria-expanded={expanded}
        title={expanded ? 'Collapse HR chart' : 'Expand HR chart'}
      >
        <span className="ride-hr-overlay__title font-display">HR</span>
        <span className="ride-hr-overlay__stats font-mono">
          Avg {avgLabel}
          <span className="ride-hr-overlay__sep">·</span>
          {liveLabel} bpm
        </span>
        <span className="ride-hr-overlay__chevron font-mono" aria-hidden>
          {expanded ? '▾' : '▸'}
        </span>
      </button>

      {expanded ? (
        hasChart ? (
          <>
            <svg
              className="ride-hr-overlay__chart"
              viewBox="0 0 100 36"
              preserveAspectRatio="none"
              aria-hidden
            >
              <defs>
                <linearGradient id="rideHrFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--accent2)"
                    stopOpacity="0.55"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--accent2)"
                    stopOpacity="0.08"
                  />
                </linearGradient>
              </defs>
              <path d={areaD} fill="url(#rideHrFill)" />
              <path
                d={lineD}
                fill="none"
                stroke="var(--accent2)"
                strokeWidth="0.6"
                vectorEffect="non-scaling-stroke"
                opacity="0.95"
              />
            </svg>
            <div className="ride-hr-overlay__footer font-mono">
              <span>Start</span>
              <span>
                {samples.length} pts · max {maxLabel}
              </span>
              <span>Now</span>
            </div>
          </>
        ) : (
          <p className="ride-hr-overlay__empty font-sans">
            HR chart fills as you ride
          </p>
        )
      ) : null}
    </div>
  );
}
