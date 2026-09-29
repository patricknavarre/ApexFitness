'use client';

import { useState } from 'react';
import { HR_ZONE_COLORS, hrZoneLabel } from '@/lib/ride/stats';
import { useHrSession } from '@/components/hr/useHrSession';

type Session = ReturnType<typeof useHrSession>;

function sparkPath(samples: number[], w: number, h: number): string {
  if (samples.length < 2) return '';
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const span = Math.max(8, max - min);
  return samples
    .map((v, i) => {
      const x = (i / (samples.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 8) - 4;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export function HrConnectActions({
  session,
}: {
  session: Pick<Session, 'bleOk' | 'connecting' | 'hrDeviceName' | 'connect' | 'disconnect' | 'mock'>;
}) {
  if (!session.bleOk) return null;

  if (!session.hrDeviceName) {
    return (
      <>
        <button
          type="button"
          className="ride-world-panel__btn ride-world-panel__btn--accent font-sans"
          onClick={() => void session.connect()}
          disabled={session.connecting}
        >
          {session.connecting ? 'Connecting…' : 'Connect HR'}
        </button>
        <button
          type="button"
          className="ride-world-panel__btn font-sans"
          onClick={session.mock}
          disabled={session.connecting}
        >
          Mock
        </button>
      </>
    );
  }

  return (
    <button
      type="button"
      className="ride-world-panel__btn font-sans"
      onClick={session.disconnect}
    >
      Disconnect
    </button>
  );
}

export function HrSessionDetails({ session }: { session: Session }) {
  const path = sparkPath(session.spark, 280, 72);
  return (
    <div className="ride-world-panel__stage workout-hr-panel__stage">
      <div className="workout-hr-panel__stats">
        <div>
          <p className="workout-hr-panel__stat-label font-mono">Avg</p>
          <p className="workout-hr-panel__stat-value font-mono">
            {session.sampleCount > 0 ? session.avgHr : '—'}
          </p>
        </div>
        <div>
          <p className="workout-hr-panel__stat-label font-mono">Max</p>
          <p className="workout-hr-panel__stat-value font-mono">
            {session.sampleCount > 0 ? session.maxHr : '—'}
          </p>
        </div>
        <div>
          <p className="workout-hr-panel__stat-label font-mono">Samples</p>
          <p className="workout-hr-panel__stat-value font-mono">{session.sampleCount}</p>
        </div>
      </div>
      <svg
        className="workout-hr-panel__spark"
        viewBox="0 0 280 72"
        preserveAspectRatio="none"
        aria-hidden
      >
        {path ? (
          <path
            d={path}
            fill="none"
            stroke="var(--zone-frame, var(--accent))"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <text
            x="140"
            y="40"
            textAnchor="middle"
            fill="var(--muted)"
            fontSize="11"
            fontFamily="inherit"
          >
            Connect HR to track zones
          </text>
        )}
      </svg>
      <p className="workout-hr-panel__hint font-sans">
        Amazfit: enable Heart Rate Push, then Connect HR. Avg/max save with the activity.
      </p>
      <label className="workout-hr-panel__maxhr font-sans">
        Max HR
        <input
          type="number"
          min={100}
          max={230}
          value={session.maxHrSetting}
          onChange={(e) => session.setMaxHrSetting(Number(e.target.value) || 184)}
          className="ml-2 w-16 bg-bg3 border border-border text-text font-mono text-sm px-2 py-1 rounded-card"
        />
      </label>
    </div>
  );
}

/** Compact inline heart-rate strip. Details open in the page flow. */
export function HrLiveStrip({ session }: { session: Session }) {
  const [more, setMore] = useState(false);
  const zoneName = session.zone != null ? hrZoneLabel(session.zone) : null;

  return (
    <div
      className={`hr-live-strip${session.zone != null ? ` ride-world-panel--z${session.zone}` : ''}`}
      style={{
        ['--zone-frame' as string]:
          session.zone != null ? HR_ZONE_COLORS[session.zone] : 'var(--border)',
      }}
    >
      <div className="hr-live-strip__row">
        <div className="hr-live-strip__bpm">
          <span className="hr-live-strip__value font-mono">
            {session.hrBpm != null ? Math.round(session.hrBpm) : '—'}
          </span>
          <span className="hr-live-strip__meta font-sans">
            {session.hrBpm != null ? 'bpm' : 'HR'}
            {zoneName ? <span className="hr-live-strip__zone">{zoneName}</span> : null}
            {session.hrDeviceName ? (
              <span className="hr-live-strip__device">{session.hrDeviceName}</span>
            ) : null}
          </span>
        </div>
        <div className="hr-live-strip__actions">
          {session.bleOk ? <HrConnectActions session={session} /> : null}
          <button
            type="button"
            className="ride-world-panel__btn font-sans"
            onClick={() => setMore((v) => !v)}
            aria-expanded={more}
          >
            {more ? 'Less' : 'More'}
          </button>
        </div>
      </div>
      {!session.bleOk ? (
        <p className="hr-live-strip__unsupported font-sans">
          Bluetooth heart rate needs Chrome on Android or desktop Chrome. iPhone browsers
          cannot pair from a website.
        </p>
      ) : null}
      {more ? <HrSessionDetails session={session} /> : null}
    </div>
  );
}
