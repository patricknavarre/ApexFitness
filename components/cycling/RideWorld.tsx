'use client';

import { useEffect, useMemo, useState } from 'react';
import type { HrZone } from '@/lib/ride/stats';

type Props = {
  active: boolean;
  speedKmh: number;
  cadenceRpm: number;
  powerWatts: number;
  ftp: number;
  gradePct: number;
  hrZone: HrZone | null;
  surge: boolean;
};

const ZONE_TINT: Record<HrZone, string> = {
  1: 'rgba(80, 140, 200, 0.18)',
  2: 'rgba(70, 180, 120, 0.22)',
  3: 'rgba(220, 180, 60, 0.24)',
  4: 'rgba(230, 120, 50, 0.28)',
  5: 'rgba(220, 60, 70, 0.32)',
};

export function RideWorld({
  active,
  speedKmh,
  cadenceRpm,
  powerWatts,
  ftp,
  gradePct,
  hrZone,
  surge,
}: Props) {
  const [particles, setParticles] = useState<{ id: number; x: number }[]>([]);

  const roadDuration = useMemo(() => {
    const s = Math.max(0, speedKmh);
    if (!active || s < 1) return 12;
    return Math.max(0.35, 8 / (s / 20));
  }, [active, speedKmh]);

  const pedalDuration = useMemo(() => {
    const c = Math.max(0, cadenceRpm);
    if (!active || c < 20) return 1.4;
    return Math.max(0.22, 60 / c);
  }, [active, cadenceRpm]);

  const lean = Math.max(-12, Math.min(14, gradePct * 0.9));
  const effort = ftp > 0 ? powerWatts / ftp : 0;

  useEffect(() => {
    if (!surge) return;
    const burst = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: 20 + Math.random() * 60,
    }));
    setParticles(burst);
    const t = window.setTimeout(() => setParticles([]), 700);
    return () => window.clearTimeout(t);
  }, [surge]);

  return (
    <div
      className={`ride-world relative overflow-hidden rounded-card border border-border ${
        surge ? 'ride-world--surge' : ''
      }`}
      style={{
        ['--road-duration' as string]: `${roadDuration}s`,
        ['--pedal-duration' as string]: `${pedalDuration}s`,
        ['--ride-lean' as string]: `${lean}deg`,
        ['--zone-tint' as string]:
          hrZone != null ? ZONE_TINT[hrZone] : 'transparent',
      }}
    >
      <div className="ride-world__sky" />
      <div className="ride-world__hills ride-world__hills--far" />
      <div className="ride-world__hills ride-world__hills--near" />
      <div className={`ride-world__road ${active ? 'ride-world__road--moving' : ''}`}>
        <div className="ride-world__lane" />
      </div>

      <div className="ride-world__rider-wrap">
        <svg
          className="ride-world__rider"
          viewBox="0 0 120 90"
          width="140"
          height="105"
          aria-hidden
        >
          <ellipse
            cx="60"
            cy="82"
            rx="28"
            ry="4"
            fill="currentColor"
            opacity="0.25"
          />
          <g className="ride-world__bike">
            <circle cx="38" cy="68" r="12" fill="none" stroke="currentColor" strokeWidth="3" />
            <circle cx="82" cy="68" r="12" fill="none" stroke="currentColor" strokeWidth="3" />
            <path
              d="M38 68 L55 48 L78 48 L82 68 M55 48 L48 68 M78 48 L60 68"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <g className={active ? 'ride-world__crank' : undefined}>
              <line
                x1="60"
                y1="68"
                x2="60"
                y2="56"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          </g>
          <g className="ride-world__body">
            <circle cx="72" cy="28" r="7" fill="currentColor" />
            <path
              d="M68 34 L58 48 L52 62 M58 48 L70 52 L78 44"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={
                active
                  ? 'M52 62 L48 74 M70 52 L74 70'
                  : 'M52 62 L50 74 M70 52 L72 70'
              }
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              className={active ? 'ride-world__legs' : undefined}
            />
          </g>
        </svg>
        {effort >= 1 && (
          <span className="ride-world__effort-tag font-mono text-[10px] uppercase tracking-widest text-accent">
            {effort >= 1.2 ? 'On another level' : 'Above FTP'}
          </span>
        )}
      </div>

      <div className="ride-world__zone" />

      {particles.map((p) => (
        <span
          key={p.id}
          className="ride-world__particle"
          style={{ left: `${p.x}%` }}
        />
      ))}

      <div className="absolute bottom-2 left-3 right-3 flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted/80">
        <span>{Math.round(speedKmh)} km/h</span>
        <span>{gradePct >= 0 ? '+' : ''}
          {gradePct.toFixed(1)}%
        </span>
        <span>{Math.round(cadenceRpm)} rpm</span>
      </div>
    </div>
  );
}
