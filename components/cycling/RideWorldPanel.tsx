'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  HR_ZONE_COLORS,
  loadWorldPanelState,
  saveWorldPanelState,
  type HrZone,
  type WorldPanelMode,
} from '@/lib/ride/stats';
import { HrZoneLadder } from '@/components/hr/HrZoneLadder';

type Props = {
  children: ReactNode;
  hrBpm: number | null;
  hrZone: HrZone | null;
  riding: boolean;
  onEndRide?: () => void;
};

const PANEL_MIN_W = 320;

function clampPosition(x: number, y: number, width: number, height: number) {
  const maxX = Math.max(8, window.innerWidth - width - 8);
  const maxY = Math.max(8, window.innerHeight - height - 8);
  return {
    x: Math.min(maxX, Math.max(8, x)),
    y: Math.min(maxY, Math.max(8, y)),
  };
}

export function RideWorldPanel({
  children,
  hrBpm,
  hrZone,
  riding,
  onEndRide,
}: Props) {
  const [mode, setMode] = useState<WorldPanelMode>('docked');
  const [pos, setPos] = useState({ x: 24, y: 48 });
  const [hydrated, setHydrated] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    const saved = loadWorldPanelState();
    setMode(saved.mode);
    setPos({ x: saved.x, y: saved.y });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || mode !== 'expanded') return;
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos((prev) => clampPosition(prev.x, prev.y, rect.width, rect.height));
  }, [hydrated, mode]);

  useEffect(() => {
    if (!hydrated) return;
    saveWorldPanelState({ mode, x: pos.x, y: pos.y });
  }, [hydrated, mode, pos.x, pos.y]);

  useEffect(() => {
    if (mode !== 'expanded') return;
    const onResize = () => {
      const el = panelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos((prev) => clampPosition(prev.x, prev.y, rect.width, rect.height));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [mode]);

  const expand = useCallback(() => {
    setMode('expanded');
    setPos((prev) => {
      const w = Math.min(window.innerWidth - 32, 960);
      const h = Math.min(window.innerHeight - 48, 560);
      return clampPosition(prev.x, prev.y, w, h);
    });
  }, []);

  const collapse = useCallback(() => {
    setMode('docked');
  }, []);

  const onHandlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (mode !== 'expanded') return;
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
    [mode, pos.x, pos.y]
  );

  const onHandlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const el = panelRef.current;
      const w = el?.offsetWidth ?? PANEL_MIN_W;
      const h = el?.offsetHeight ?? 400;
      const next = clampPosition(
        drag.origX + (e.clientX - drag.startX),
        drag.origY + (e.clientY - drag.startY),
        w,
        h
      );
      setPos(next);
    },
    []
  );

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

  const expanded = mode === 'expanded';

  return (
    <>
      {expanded ? (
        <div className="ride-world-panel__spacer" aria-hidden />
      ) : null}

      <div
        ref={panelRef}
        className={`ride-world-panel${expanded ? ' ride-world-panel--expanded' : ' ride-world-panel--docked'}${
          hrZone != null ? ` ride-world-panel--z${hrZone}` : ''
        }`}
        style={
          expanded
            ? {
                left: pos.x,
                top: pos.y,
                ['--zone-frame' as string]:
                  hrZone != null ? HR_ZONE_COLORS[hrZone] : 'var(--border)',
              }
            : {
                ['--zone-frame' as string]:
                  hrZone != null ? HR_ZONE_COLORS[hrZone] : 'var(--border)',
              }
        }
      >
        <div
          className={`ride-world-panel__chrome${expanded ? ' ride-world-panel__chrome--drag' : ''}`}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="ride-world-panel__chrome-left">
            {expanded ? (
              <span
                className="ride-world-panel__drag-hint font-mono"
                aria-hidden
              >
                ⋮⋮
              </span>
            ) : null}
            <span className="ride-world-panel__title font-display">
              Ride view
            </span>
          </div>
          <div className="ride-world-panel__chrome-actions">
            {expanded && riding && onEndRide ? (
              <button
                type="button"
                className="ride-world-panel__btn ride-world-panel__btn--accent font-sans"
                onClick={onEndRide}
              >
                End &amp; save
              </button>
            ) : null}
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

        <HrZoneLadder hrZone={hrZone} hrBpm={hrBpm} />

        <div className="ride-world-panel__stage">{children}</div>
      </div>
    </>
  );
}
