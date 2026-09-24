'use client';

import { useMemo } from 'react';
import {
  elevationProfile,
  type RideCourse,
} from '@/lib/ride/courses';

type Props = {
  course: RideCourse;
  distanceM: number;
  gradePct: number;
  elevationGainM: number;
  /** Trainer accepted SIM grade updates */
  trainerLinked: boolean;
};

export function ElevationProfileOverlay({
  course,
  distanceM,
  gradePct,
  elevationGainM,
  trainerLinked,
}: Props) {
  const profile = useMemo(() => elevationProfile(course, 72), [course]);
  const len = Math.max(1, course.lengthMeters);
  const progress = Math.min(1, Math.max(0, distanceM / len));

  const { areaD, lineD, maxElev, markerX, markerY } = useMemo(() => {
    const maxE = Math.max(1, ...profile.map((p) => p.elev));
    const w = 100;
    const h = 36;
    const padY = 2;
    const pts = profile.map((p) => {
      const x = (p.d / len) * w;
      const y = h - padY - (p.elev / maxE) * (h - padY * 2);
      return { x, y };
    });
    const line = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' ');
    const area = `${line} L${w},${h} L0,${h} Z`;
    const idx = Math.min(
      pts.length - 1,
      Math.round(progress * (pts.length - 1))
    );
    return {
      areaD: area,
      lineD: line,
      maxElev: maxE,
      markerX: pts[idx]?.x ?? 0,
      markerY: pts[idx]?.y ?? h / 2,
    };
  }, [profile, len, progress]);

  const gradeLabel = `${gradePct >= 0 ? '+' : ''}${gradePct.toFixed(1)}%`;

  return (
    <div className="ride-elev-overlay" aria-label="Course elevation profile">
      <div className="ride-elev-overlay__meta">
        <span className="ride-elev-overlay__title font-display">
          {course.name}
        </span>
        <span className="ride-elev-overlay__stats font-mono">
          {gradeLabel}
          <span className="ride-elev-overlay__sep">·</span>
          {Math.round(elevationGainM)} m gain
        </span>
        <span
          className={`ride-elev-overlay__link font-mono${
            trainerLinked ? ' is-live' : ''
          }`}
          title={
            trainerLinked
              ? 'Trainer SIM grade is following this profile'
              : 'Connect an FTMS trainer to feel grade changes'
          }
        >
          {trainerLinked ? 'SIM live' : 'SIM off'}
        </span>
      </div>
      <svg
        className="ride-elev-overlay__chart"
        viewBox="0 0 100 36"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="rideElevFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#rideElevFill)" />
        <path
          d={lineD}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="0.6"
          vectorEffect="non-scaling-stroke"
          opacity="0.9"
        />
        {/* Rider position */}
        <line
          x1={markerX}
          y1="0"
          x2={markerX}
          y2="36"
          stroke="var(--tan)"
          strokeWidth="0.35"
          strokeDasharray="1.2 1.2"
          opacity="0.7"
        />
        <circle
          cx={markerX}
          cy={markerY}
          r="1.6"
          fill="var(--accent)"
          stroke="var(--bg)"
          strokeWidth="0.5"
        />
      </svg>
      <div className="ride-elev-overlay__footer font-mono">
        <span>Start</span>
        <span>
          {Math.round(progress * 100)}% · peak {Math.round(maxElev)} m
        </span>
        <span>Finish</span>
      </div>
    </div>
  );
}
