'use client';

import { useEffect, useRef, useState } from 'react';
import {
  formatSpeed,
  HR_ZONE_GLOW,
  HR_ZONE_TINT,
  type HrZone,
  type SpeedUnit,
} from '@/lib/ride/stats';

type Props = {
  active: boolean;
  speedKmh: number;
  cadenceRpm: number;
  powerWatts: number;
  ftp: number;
  gradePct: number;
  hrBpm: number | null;
  hrZone: HrZone | null;
  surge: boolean;
  speedUnit: SpeedUnit;
  onToggleSpeedUnit: () => void;
};

/** px of road texture advanced per km/h per second (toward viewer) */
const ROAD_PX_PER_KMH = 14;
/** Floor so a crawl still moves when above the stop gate */
const SCROLL_FLOOR_KMH = 1.2;
const STOP_SPEED_KMH = 2;
const STOP_CADENCE_RPM = 25;
const HILLS_FAR_RATIO = 0.05;
const HILLS_NEAR_RATIO = 0.12;
/** Ease rate toward target scroll velocity (higher = snappier) */
const EASE_IN = 10;
const EASE_OUT = 7;

function shouldFreeze(
  active: boolean,
  speedKmh: number,
  cadenceRpm: number
): boolean {
  if (!active) return true;
  return speedKmh < STOP_SPEED_KMH && cadenceRpm < STOP_CADENCE_RPM;
}

export function RideWorld({
  active,
  speedKmh,
  cadenceRpm,
  powerWatts,
  ftp,
  gradePct,
  hrBpm,
  hrZone,
  surge,
  speedUnit,
  onToggleSpeedUnit,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);
  const metricsRef = useRef({ active, speedKmh, cadenceRpm });
  const reducedMotionRef = useRef(false);
  const [particles, setParticles] = useState<{ id: number; x: number }[]>([]);

  metricsRef.current = { active, speedKmh, cadenceRpm };

  const lean = Math.max(-12, Math.min(14, gradePct * 0.9));
  const effort = ftp > 0 ? powerWatts / ftp : 0;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      reducedMotionRef.current = mq.matches;
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const { active: isActive, speedKmh: spd, cadenceRpm: cad } =
        metricsRef.current;
      const freeze =
        reducedMotionRef.current || shouldFreeze(isActive, spd, cad);
      const target = freeze
        ? 0
        : Math.max(SCROLL_FLOOR_KMH, Math.max(0, spd)) * ROAD_PX_PER_KMH;

      const ease = freeze ? EASE_OUT : EASE_IN;
      let vel = velocityRef.current;
      vel += (target - vel) * Math.min(1, ease * dt);
      if (Math.abs(vel) < 0.05) vel = 0;
      velocityRef.current = vel;

      offsetRef.current += vel * dt;
      const offset = offsetRef.current;
      const el = rootRef.current;
      if (el) {
        el.style.setProperty('--road-offset', `${offset}px`);
        el.style.setProperty(
          '--hills-far-offset',
          `${offset * HILLS_FAR_RATIO}px`
        );
        el.style.setProperty(
          '--hills-near-offset',
          `${offset * HILLS_NEAR_RATIO}px`
        );
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

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
      ref={rootRef}
      className={`ride-world relative overflow-hidden ${
        surge ? 'ride-world--surge' : ''
      }${hrZone != null ? ` ride-world--z${hrZone}` : ''}`}
      style={{
        ['--ride-lean' as string]: `${lean}deg`,
        ['--zone-tint' as string]:
          hrZone != null ? HR_ZONE_TINT[hrZone] : 'transparent',
        ['--zone-glow' as string]:
          hrZone != null ? HR_ZONE_GLOW[hrZone] : 'transparent',
      }}
      data-hr-bpm={hrBpm != null ? Math.round(hrBpm) : undefined}
    >
      <div className="ride-world__sky" />
      <div className="ride-world__haze" />
      <div className="ride-world__hills ride-world__hills--far" />
      <div className="ride-world__hills ride-world__hills--near" />

      <div className="ride-world__lean">
        <div className="ride-world__horizon-line" />
        <div className="ride-world__ground">
          <div className="ride-world__road">
            <div className="ride-world__asphalt" />
            <div className="ride-world__vanishing" />
            <div className="ride-world__edge ride-world__edge--left" />
            <div className="ride-world__edge ride-world__edge--right" />
            <div className="ride-world__lane" />
            <div className="ride-world__markers ride-world__markers--left" />
            <div className="ride-world__markers ride-world__markers--right" />
          </div>
        </div>
      </div>

      <div className="ride-world__cockpit" aria-hidden>
        <div className="ride-world__stem" />
        <div className="ride-world__bar">
          <span className="ride-world__hood ride-world__hood--left" />
          <span className="ride-world__hood ride-world__hood--right" />
        </div>
      </div>

      {effort >= 1 && (
        <span className="ride-world__effort-tag font-mono text-[10px] uppercase tracking-widest text-accent">
          {effort >= 1.2 ? 'On another level' : 'Above FTP'}
        </span>
      )}

      <div className="ride-world__zone" />

      {particles.map((p) => (
        <span
          key={p.id}
          className="ride-world__particle"
          style={{ left: `${p.x}%` }}
        />
      ))}

      <div className="ride-world__hud absolute bottom-2 left-3 right-3 flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted/80">
        <button
          type="button"
          onClick={onToggleSpeedUnit}
          className="ride-world__speed-btn hover:text-text transition-colors"
          title="Toggle km/h ↔ mph"
        >
          {formatSpeed(speedKmh, speedUnit, 0)}
        </button>
        <span>
          {gradePct >= 0 ? '+' : ''}
          {gradePct.toFixed(1)}%
        </span>
        <span>{Math.round(cadenceRpm)} rpm</span>
      </div>
    </div>
  );
}
