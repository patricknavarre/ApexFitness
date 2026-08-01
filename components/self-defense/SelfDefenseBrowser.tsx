'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  YOUTH_SD_EQUIPMENT,
  YOUTH_SD_MODULES,
  type YouthSdModule,
} from '@/lib/youthSelfDefenseWorkoutData';
import {
  InteractiveWorkout,
  clearWorkoutSetProgress,
} from '@/components/workouts/InteractiveWorkout';

export function SelfDefenseBrowser() {
  const [active, setActive] = useState<YouthSdModule | null>(null);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/me')
      .then((res) => (res.ok ? res.json() : Promise.resolve({})))
      .then((data: { activePlanId?: string | null }) => {
        if (cancelled || data.activePlanId !== 'youth-sd') return;
        void fetch('/api/user/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activePlanId: null,
            planStartedAt: null,
            activePlanDayNumber: null,
            activePlanDaySetOn: null,
          }),
        });
      })
      .catch(() => {
        // ignore
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function markModuleDone(mod: YouthSdModule) {
    setLogging(true);
    try {
      const res = await fetch('/api/workout/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'youth-sd', dayNumber: mod.number }),
      });
      if (!res.ok) throw new Error('Failed to log');
      clearWorkoutSetProgress('youth-sd', mod.number);
      toast.success('Module logged.');
      setActive(null);
    } catch {
      toast.error('Could not log module');
    } finally {
      setLogging(false);
    }
  }

  if (active) {
    return (
      <InteractiveWorkout
        planId="youth-sd"
        dayNumber={active.number}
        dayTitle={active.title}
        workout={active.workout}
        equipment={YOUTH_SD_EQUIPMENT}
        onClose={() => setActive(null)}
        onMarkDone={() => {
          if (logging) return;
          void markModuleDone(active);
        }}
      />
    );
  }

  return (
    <div
      className="max-w-3xl space-y-6 rounded-card p-1"
      style={{
        background:
          'linear-gradient(160deg, #12140F 0%, #1a1f12 45%, #12140F 100%)',
      }}
    >
      <div className="px-1 pt-1">
        <p
          className="font-mono text-[10px] uppercase tracking-[0.22em] mb-2"
          style={{ color: '#C4A35A' }}
        >
          Youth program · MCMAP-adapted
        </p>
        <h1
          className="font-display text-3xl uppercase tracking-wide"
          style={{ color: '#D2B48C' }}
        >
          Self-Defense
        </h1>
        <p className="font-sans text-sm mt-2 leading-relaxed" style={{ color: '#a89b7c' }}>
          Four modules. Progress in order. Adult/instructor supervision required.
          Escape and get to a safe adult — never win the fight.
        </p>
      </div>

      <div
        className="rounded-card border px-4 py-3"
        style={{ borderColor: '#8B7355', backgroundColor: '#1a1f12' }}
      >
        <p
          className="font-mono text-[10px] uppercase tracking-widest mb-2"
          style={{ color: '#C4A35A' }}
        >
          Gear
        </p>
        <ul className="space-y-1">
          {YOUTH_SD_EQUIPMENT.map((item) => (
            <li key={item} className="font-sans text-xs" style={{ color: '#a89b7c' }}>
              · {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        {YOUTH_SD_MODULES.map((mod) => {
          const exerciseCount = mod.workout.sections.reduce(
            (n, s) => n + s.exercises.length,
            0
          );
          const accent =
            mod.phase === 'STRIKES'
              ? '#C4A35A'
              : mod.phase === 'ESCAPES'
                ? '#8B7355'
                : '#D2B48C';
          return (
            <div
              key={mod.id}
              className="rounded-card border overflow-hidden"
              style={{ borderColor: '#4B5320', backgroundColor: '#161a10' }}
            >
              <div
                className="px-4 py-3 border-b"
                style={{ borderColor: '#3D4A1F', backgroundColor: '#2A3318' }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: accent }}
                  >
                    Module {String(mod.number).padStart(2, '0')}
                  </p>
                  <p className="font-mono text-[10px]" style={{ color: '#8B7355' }}>
                    {exerciseCount} drills
                  </p>
                </div>
                <h2
                  className="font-display text-xl uppercase tracking-wide mt-1"
                  style={{ color: '#D2B48C' }}
                >
                  {mod.title}
                </h2>
              </div>
              <div className="px-4 py-4 space-y-3">
                <p className="font-sans text-sm" style={{ color: '#a89b7c' }}>
                  {mod.summary}
                </p>
                <ul className="space-y-1">
                  {mod.workout.sections.flatMap((section) =>
                    section.exercises.map((ex) => (
                      <li
                        key={ex.name}
                        className="font-sans text-xs flex justify-between gap-3"
                        style={{ color: '#c4b896' }}
                      >
                        <span className="truncate">{ex.name}</span>
                        <span className="shrink-0 font-mono" style={{ color: '#8B7355' }}>
                          {ex.sets}×{ex.reps}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
                <button
                  type="button"
                  onClick={() => setActive(mod)}
                  className="w-full rounded-card py-3 font-sans text-sm font-bold uppercase tracking-wide transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#4B5320', color: '#D2B48C' }}
                >
                  Practice
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p
        className="font-mono text-[10px] uppercase tracking-widest text-center pb-2"
        style={{ color: '#5c5340' }}
      >
        Clear space · Create distance · Yell / run
      </p>
    </div>
  );
}
