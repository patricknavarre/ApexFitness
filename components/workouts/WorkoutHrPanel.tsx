'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { HrZoneLadder } from '@/components/hr/HrZoneLadder';
import { HrConnectActions, HrLiveStrip, HrSessionDetails } from '@/components/hr/HrLiveStrip';
import { useHrSession, useIsPhone, type HrSessionStats } from '@/components/hr/useHrSession';
import { HR_ZONE_COLORS, type WorldPanelMode } from '@/lib/ride/stats';

const PANEL_STORAGE_KEY = 'apex.workout.hrPanel';
const PANEL_MIN_W = 280;

export type WorkoutHrStats = HrSessionStats;

export type WorkoutHrPanelHandle = {
  getStats: () => WorkoutHrStats;
  disconnect: () => void;
};

type Props = {
  onStatsChange?: (stats: WorkoutHrStats) => void;
};

function clampPosition(x: number, y: number, width: number, height: number) {
  const maxX = Math.max(8, window.innerWidth - width - 8);
  const maxY = Math.max(8, window.innerHeight - height - 8);
  return {
    x: Math.min(maxX, Math.max(8, x)),
    y: Math.min(maxY, Math.max(8, y)),
  };
}

function loadPanelState(): { mode: WorldPanelMode; x: number; y: number } {
  if (typeof window === 'undefined') return { mode: 'docked', x: 24, y: 96 };
  try {
    const raw = window.localStorage.getItem(PANEL_STORAGE_KEY);
    if (!raw) return { mode: 'docked', x: 24, y: 96 };
    const parsed = JSON.parse(raw) as { mode?: string; x?: number; y?: number };
    return {
      mode: parsed.mode === 'expanded' ? 'expanded' : 'docked',
      x: typeof parsed.x === 'number' && Number.isFinite(parsed.x) ? parsed.x : 24,
      y: typeof parsed.y === 'number' && Number.isFinite(parsed.y) ? parsed.y : 96,
    };
  } catch {
    return { mode: 'docked', x: 24, y: 96 };
  }
}

function savePanelState(state: { mode: WorldPanelMode; x: number; y: number }) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    PANEL_STORAGE_KEY,
    JSON.stringify({
      mode: state.mode,
      x: Math.round(state.x),
      y: Math.round(state.y),
    })
  );
}

export const WorkoutHrPanel = forwardRef<WorkoutHrPanelHandle, Props>(
  function WorkoutHrPanel({ onStatsChange }, ref) {
    const isPhone = useIsPhone();
    const session = useHrSession(true);
    const [mode, setMode] = useState<WorldPanelMode>('docked');
    const [pos, setPos] = useState({ x: 24, y: 96 });
    const [hydrated, setHydrated] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{
      pointerId: number;
      startX: number;
      startY: number;
      origX: number;
      origY: number;
    } | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        getStats: session.getStats,
        disconnect: session.disconnect,
      }),
      [session.getStats, session.disconnect]
    );

    useEffect(() => {
      onStatsChange?.(session.getStats());
    }, [onStatsChange, session.getStats, session.sampleCount, session.hrDeviceName, session.hrBpm]);

    useEffect(() => {
      const saved = loadPanelState();
      setMode(saved.mode);
      setPos({ x: saved.x, y: saved.y });
      setHydrated(true);
    }, []);

    useEffect(() => {
      if (!hydrated || isPhone) return;
      savePanelState({ mode, x: pos.x, y: pos.y });
    }, [hydrated, isPhone, mode, pos.x, pos.y]);

    useEffect(() => {
      if (!hydrated || isPhone || mode !== 'expanded') return;
      const el = panelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos((prev) => clampPosition(prev.x, prev.y, rect.width, rect.height));
    }, [hydrated, isPhone, mode]);

    useEffect(() => {
      if (isPhone || mode !== 'expanded') return;
      const onResize = () => {
        const el = panelRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setPos((prev) => clampPosition(prev.x, prev.y, rect.width, rect.height));
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, [isPhone, mode]);

    const expand = useCallback(() => {
      setMode('expanded');
      setPos((prev) => {
        const w = Math.min(window.innerWidth - 32, 420);
        const h = Math.min(window.innerHeight - 48, 360);
        return clampPosition(prev.x, prev.y, w, h);
      });
    }, []);

    const collapse = useCallback(() => setMode('docked'), []);

    const onHandlePointerDown = useCallback(
      (e: ReactPointerEvent<HTMLDivElement>) => {
        if (isPhone || mode !== 'expanded') return;
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest('button, a, input, select, textarea, label')) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          origX: pos.x,
          origY: pos.y,
        };
      },
      [isPhone, mode, pos.x, pos.y]
    );

    const onHandlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const el = panelRef.current;
      const w = el?.offsetWidth ?? PANEL_MIN_W;
      const h = el?.offsetHeight ?? 280;
      setPos(
        clampPosition(
          drag.origX + (e.clientX - drag.startX),
          drag.origY + (e.clientY - drag.startY),
          w,
          h
        )
      );
    }, []);

    const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      dragRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    }, []);

    if (isPhone) {
      return <HrLiveStrip session={session} />;
    }

    const expanded = mode === 'expanded';
    const zone = session.zone;

    return (
      <>
        {expanded ? <div className="workout-hr-panel__spacer" aria-hidden /> : null}

        <div
          ref={panelRef}
          className={`ride-world-panel workout-hr-panel${
            expanded ? ' ride-world-panel--expanded workout-hr-panel--expanded' : ' ride-world-panel--docked'
          }${zone != null ? ` ride-world-panel--z${zone}` : ''}`}
          style={
            expanded
              ? {
                  left: pos.x,
                  top: pos.y,
                  ['--zone-frame' as string]:
                    zone != null ? HR_ZONE_COLORS[zone] : 'var(--border)',
                }
              : {
                  ['--zone-frame' as string]:
                    zone != null ? HR_ZONE_COLORS[zone] : 'var(--border)',
                }
          }
        >
          <div className="ride-world-panel__chrome">
            <div
              className={`ride-world-panel__chrome-left${expanded ? ' ride-world-panel__chrome--drag' : ''}`}
              onPointerDown={onHandlePointerDown}
              onPointerMove={onHandlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              {expanded ? (
                <span className="ride-world-panel__drag-hint font-mono" aria-hidden>
                  ⋮⋮
                </span>
              ) : null}
              <span className="ride-world-panel__title font-display">Heart rate</span>
              {session.hrDeviceName ? (
                <span className="workout-hr-panel__device font-sans">{session.hrDeviceName}</span>
              ) : null}
            </div>
            <div className="ride-world-panel__chrome-actions">
              <HrConnectActions session={session} />
              {expanded ? (
                <button
                  type="button"
                  className="ride-world-panel__btn font-sans"
                  onClick={collapse}
                >
                  Collapse
                </button>
              ) : (
                <button
                  type="button"
                  className="ride-world-panel__btn font-sans"
                  onClick={expand}
                >
                  Expand
                </button>
              )}
            </div>
          </div>

          <HrZoneLadder hrZone={zone} hrBpm={session.hrBpm} />
          {!session.bleOk ? (
            <p className="hr-live-strip__unsupported font-sans">
              Bluetooth heart rate needs Chrome on Android or desktop Chrome. iPhone browsers
              cannot pair from a website.
            </p>
          ) : null}
          <HrSessionDetails session={session} />
        </div>
      </>
    );
  }
);
