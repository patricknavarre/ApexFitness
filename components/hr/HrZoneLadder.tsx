'use client';

import {
  HR_ZONE_COLORS,
  HR_ZONES,
  hrZoneLabel,
  type HrZone,
} from '@/lib/ride/stats';

export function HrZoneLadder({
  hrZone,
  hrBpm,
}: {
  hrZone: HrZone | null;
  hrBpm: number | null;
}) {
  return (
    <div className="ride-zone-chrome" aria-live="polite">
      <div className="ride-zone-chrome__bpm">
        <span className="ride-zone-chrome__bpm-value font-mono">
          {hrBpm != null ? Math.round(hrBpm) : '—'}
        </span>
        <span className="ride-zone-chrome__bpm-meta font-sans">
          {hrBpm != null ? 'bpm' : 'HR'}
          {hrZone != null ? (
            <span className="ride-zone-chrome__zone-name">{hrZoneLabel(hrZone)}</span>
          ) : null}
        </span>
      </div>
      <div className="ride-zone-ladder" role="list" aria-label="Heart rate zones">
        {HR_ZONES.map((z) => {
          const active = hrZone === z;
          return (
            <div
              key={z}
              role="listitem"
              className={`ride-zone-ladder__step${active ? ' is-active' : ''}`}
              style={{
                ['--zone-color' as string]: HR_ZONE_COLORS[z],
              }}
              title={hrZoneLabel(z)}
            >
              <span className="ride-zone-ladder__label font-mono">Z{z}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
