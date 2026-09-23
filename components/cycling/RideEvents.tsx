'use client';

import { useEffect, useRef, useState } from 'react';

export type RideHudEvent = {
  id: string;
  title: string;
  detail?: string;
  kind: 'lap' | 'pr' | 'zone' | 'surge' | 'xp' | 'badge';
};

export type RideMomentKind = 'climb' | 'sprint' | 'push' | 'milestone' | 'pr';

export type RideMoment = {
  id: string;
  kind: RideMomentKind;
  title: string;
  detail?: string;
};

const KIND_CLASS: Record<RideHudEvent['kind'], string> = {
  lap: 'border-accent3/50 text-tan',
  pr: 'border-accent text-accent shadow-glow',
  zone: 'border-accent2/50 text-accent2',
  surge: 'border-accent text-accent',
  xp: 'border-accent text-accent',
  badge: 'border-accent text-accent shadow-glow',
};

const MOMENT_CLASS: Record<RideMomentKind, string> = {
  climb: 'ride-moment--climb',
  sprint: 'ride-moment--sprint',
  push: 'ride-moment--push',
  milestone: 'ride-moment--milestone',
  pr: 'ride-moment--pr',
};

const MOMENT_EYEBROW: Record<RideMomentKind, string> = {
  climb: 'Climb',
  sprint: 'Sprint',
  push: 'Push',
  milestone: 'Milestone',
  pr: 'Personal best',
};

export function RideEventToasts({
  events,
  onDismiss,
}: {
  events: RideHudEvent[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-col items-center gap-2 px-3">
      {events.slice(0, 3).map((ev) => (
        <ToastItem key={ev.id} event={ev} onDone={() => onDismiss(ev.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  event,
  onDone,
}: {
  event: RideHudEvent;
  onDone: () => void;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const enter = window.setTimeout(() => setShow(true), 20);
    const leave = window.setTimeout(() => {
      setShow(false);
      window.setTimeout(onDone, 280);
    }, 2400);
    return () => {
      window.clearTimeout(enter);
      window.clearTimeout(leave);
    };
  }, [event.id, onDone]);

  return (
    <div
      className={`rounded-card border bg-card/95 px-4 py-2 text-center backdrop-blur transition-all duration-300 ${
        KIND_CLASS[event.kind]
      } ${show ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}
    >
      <p className="font-display text-sm uppercase tracking-wide">{event.title}</p>
      {event.detail ? (
        <p className="font-sans text-xs text-muted mt-0.5">{event.detail}</p>
      ) : null}
    </div>
  );
}

/** Larger motivational card over the FPV stage for climbs, sprints, etc. */
export function RideMomentOverlay({
  moment,
  onDismiss,
}: {
  moment: RideMoment | null;
  onDismiss: (id: string) => void;
}) {
  const [show, setShow] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!moment) {
      setShow(false);
      return;
    }

    const momentId = moment.id;
    setShow(false);
    const enter = window.setTimeout(() => setShow(true), 30);
    /** Hold long enough to read, then auto-close (10–15s range). */
    const leave = window.setTimeout(() => {
      setShow(false);
    }, 12_000);
    const remove = window.setTimeout(() => {
      onDismissRef.current(momentId);
    }, 12_320);

    return () => {
      window.clearTimeout(enter);
      window.clearTimeout(leave);
      window.clearTimeout(remove);
    };
  }, [moment?.id]);

  if (!moment) return null;

  return (
    <div className="ride-moment-layer" aria-live="assertive">
      <button
        type="button"
        className={`ride-moment ${MOMENT_CLASS[moment.kind]}${
          show ? ' ride-moment--show' : ''
        }`}
        onClick={() => {
          setShow(false);
          window.setTimeout(() => onDismissRef.current(moment.id), 280);
        }}
      >
        <span className="ride-moment__eyebrow font-mono">
          {MOMENT_EYEBROW[moment.kind]}
        </span>
        <span className="ride-moment__title font-display">{moment.title}</span>
        {moment.detail ? (
          <span className="ride-moment__detail font-sans">{moment.detail}</span>
        ) : null}
      </button>
    </div>
  );
}

export function RideXpCelebration({
  open,
  xpGained,
  levelBefore,
  levelAfter,
  newBadges,
  onClose,
}: {
  open: boolean;
  xpGained: number;
  levelBefore: { level: number; title: string; progressPct: number };
  levelAfter: {
    level: number;
    title: string;
    progressPct: number;
    totalXp: number;
  };
  newBadges: string[];
  onClose: () => void;
}) {
  if (!open) return null;
  const leveledUp = levelAfter.level > levelBefore.level;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-card border border-accent/40 bg-card p-6 shadow-glow od-enter">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">
          Ride complete
        </p>
        <h2 className="font-display text-3xl text-accent uppercase tracking-wide">
          +{xpGained} XP
        </h2>
        {leveledUp ? (
          <p className="font-sans text-sm text-tan mt-2">
            Level up! → L{levelAfter.level} {levelAfter.title}
          </p>
        ) : (
          <p className="font-sans text-sm text-muted mt-2">
            L{levelAfter.level} {levelAfter.title}
          </p>
        )}
        <div className="mt-4 h-2 rounded-full bg-bg3 overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-700"
            style={{ width: `${levelAfter.progressPct}%` }}
          />
        </div>
        <p className="font-mono text-[10px] text-muted mt-1.5">
          {levelAfter.totalXp} XP total
        </p>
        {newBadges.length > 0 && (
          <ul className="mt-4 space-y-1">
            {newBadges.map((b) => (
              <li
                key={b}
                className="font-sans text-sm text-accent border border-accent/30 rounded-card px-3 py-1.5"
              >
                Badge unlocked: {b}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full font-sans text-sm px-4 py-2.5 rounded-card bg-accent text-bg font-medium od-cta"
        >
          Nice
        </button>
      </div>
    </div>
  );
}
