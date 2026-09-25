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
import { toast } from 'sonner';
import { connectHeartRateMonitor, isWebBluetoothSupported, type HrConnection } from '@/lib/ble/hr-client';
import { startMockHeartRate } from '@/lib/ble/mock-trainer';
import { HrZoneLadder } from '@/components/hr/HrZoneLadder';
import {
  HR_ZONE_COLORS,
  hrZone,
  loadRidePrefs,
  type HrZone,
  type WorldPanelMode,
} from '@/lib/ride/stats';

const PANEL_STORAGE_KEY = 'apex.workout.hrPanel';
const PANEL_MIN_W = 280;
const SPARK_MAX = 48;

export type WorkoutHrStats = {
  avgHeartRateBpm: number | null;
  maxHeartRateBpm: number | null;
  hrDeviceName: string | null;
  sampleCount: number;
};

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

export const WorkoutHrPanel = forwardRef<WorkoutHrPanelHandle, Props>(
  function WorkoutHrPanel({ onStatsChange }, ref) {
    const [mode, setMode] = useState<WorldPanelMode>('docked');
    const [pos, setPos] = useState({ x: 24, y: 96 });
    const [hydrated, setHydrated] = useState(false);
    const [bleOk, setBleOk] = useState(false);
    const [hrBpm, setHrBpm] = useState<number | null>(null);
    const [hrDeviceName, setHrDeviceName] = useState<string | null>(null);
    const [maxHrSetting, setMaxHrSetting] = useState(184);
    const [spark, setSpark] = useState<number[]>([]);
    const [avgHr, setAvgHr] = useState(0);
    const [maxHr, setMaxHr] = useState(0);
    const [sampleCount, setSampleCount] = useState(0);

    const panelRef = useRef<HTMLDivElement>(null);
    const hrConnRef = useRef<HrConnection | { disconnect: () => void } | null>(null);
    const sumRef = useRef(0);
    const countRef = useRef(0);
    const maxRef = useRef(0);
    const deviceNameRef = useRef<string | null>(null);
    const maxHrSettingRef = useRef(184);
    const dragRef = useRef<{
      pointerId: number;
      startX: number;
      startY: number;
      origX: number;
      origY: number;
    } | null>(null);

    const emitStats = useCallback(() => {
      const stats: WorkoutHrStats = {
        avgHeartRateBpm: countRef.current > 0 ? Math.round(sumRef.current / countRef.current) : null,
        maxHeartRateBpm: maxRef.current > 0 ? Math.round(maxRef.current) : null,
        hrDeviceName: deviceNameRef.current,
        sampleCount: countRef.current,
      };
      onStatsChange?.(stats);
      return stats;
    }, [onStatsChange]);

    useEffect(() => {
      setBleOk(isWebBluetoothSupported());
      const saved = loadPanelState();
      setMode(saved.mode);
      setPos({ x: saved.x, y: saved.y });
      const prefs = loadRidePrefs();
      setMaxHrSetting(prefs.maxHr);
      maxHrSettingRef.current = prefs.maxHr;
      setHydrated(true);
      return () => {
        hrConnRef.current?.disconnect();
        hrConnRef.current = null;
      };
    }, []);

    useEffect(() => {
      maxHrSettingRef.current = maxHrSetting;
    }, [maxHrSetting]);

    useEffect(() => {
      if (!hydrated) return;
      savePanelState({ mode, x: pos.x, y: pos.y });
    }, [hydrated, mode, pos.x, pos.y]);

    useEffect(() => {
      if (!hydrated || mode !== 'expanded') return;
      const el = panelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos((prev) => clampPosition(prev.x, prev.y, rect.width, rect.height));
    }, [hydrated, mode]);

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

    const onHr = useCallback(
      (bpm: number) => {
        if (!Number.isFinite(bpm) || bpm <= 0) return;
        setHrBpm(bpm);
        sumRef.current += bpm;
        countRef.current += 1;
        if (bpm > maxRef.current) maxRef.current = bpm;
        setAvgHr(Math.round(sumRef.current / countRef.current));
        setMaxHr(Math.round(maxRef.current));
        setSampleCount(countRef.current);
        setSpark((prev) => {
          const next = [...prev, Math.round(bpm)];
          return next.length > SPARK_MAX ? next.slice(-SPARK_MAX) : next;
        });
        emitStats();
      },
      [emitStats]
    );

    const disconnect = useCallback(() => {
      hrConnRef.current?.disconnect();
      hrConnRef.current = null;
      deviceNameRef.current = null;
      setHrDeviceName(null);
      setHrBpm(null);
      emitStats();
    }, [emitStats]);

    useImperativeHandle(
      ref,
      () => ({
        getStats: () => ({
          avgHeartRateBpm:
            countRef.current > 0 ? Math.round(sumRef.current / countRef.current) : null,
          maxHeartRateBpm: maxRef.current > 0 ? Math.round(maxRef.current) : null,
          hrDeviceName: deviceNameRef.current,
          sampleCount: countRef.current,
        }),
        disconnect,
      }),
      [disconnect]
    );

    async function handleConnect() {
      try {
        const conn = await connectHeartRateMonitor(onHr, () => {
          deviceNameRef.current = null;
          setHrDeviceName(null);
          setHrBpm(null);
          hrConnRef.current = null;
          emitStats();
          toast.message('Heart rate monitor disconnected');
        });
        hrConnRef.current?.disconnect();
        hrConnRef.current = conn;
        deviceNameRef.current = conn.deviceName;
        setHrDeviceName(conn.deviceName);
        emitStats();
        toast.success(`Connected ${conn.deviceName}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not connect HR');
      }
    }

    function handleMock() {
      hrConnRef.current?.disconnect();
      const conn = startMockHeartRate(onHr);
      hrConnRef.current = conn;
      deviceNameRef.current = conn.deviceName;
      setHrDeviceName(conn.deviceName);
      emitStats();
      toast.success('Mock HR running');
    }

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

    const zone: HrZone | null =
      hrBpm != null ? hrZone(hrBpm, maxHrSettingRef.current) : null;
    const expanded = mode === 'expanded';
    const path = sparkPath(spark, 280, 72);

    const connectActions = (
      <>
        {!hrDeviceName ? (
          <>
            <button
              type="button"
              className="ride-world-panel__btn ride-world-panel__btn--accent font-sans"
              onClick={() => void handleConnect()}
              disabled={!bleOk}
              title={
                bleOk
                  ? 'Pair Amazfit / chest strap'
                  : 'Web Bluetooth not available in this browser'
              }
            >
              Connect HR
            </button>
            <button
              type="button"
              className="ride-world-panel__btn font-sans"
              onClick={handleMock}
            >
              Mock
            </button>
          </>
        ) : (
          <button
            type="button"
            className="ride-world-panel__btn font-sans"
            onClick={disconnect}
          >
            Disconnect
          </button>
        )}
      </>
    );

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
          <div
            className={`ride-world-panel__chrome${expanded ? ' ride-world-panel__chrome--drag' : ''}`}
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div className="ride-world-panel__chrome-left">
              {expanded ? (
                <span className="ride-world-panel__drag-hint font-mono" aria-hidden>
                  ⋮⋮
                </span>
              ) : null}
              <span className="ride-world-panel__title font-display">Heart rate</span>
              {hrDeviceName ? (
                <span className="workout-hr-panel__device font-sans">{hrDeviceName}</span>
              ) : null}
            </div>
            <div className="ride-world-panel__chrome-actions">
              {connectActions}
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

          <HrZoneLadder hrZone={zone} hrBpm={hrBpm} />

          <div className="ride-world-panel__stage workout-hr-panel__stage">
            <div className="workout-hr-panel__stats">
              <div>
                <p className="workout-hr-panel__stat-label font-mono">Avg</p>
                <p className="workout-hr-panel__stat-value font-mono">
                  {sampleCount > 0 ? avgHr : '—'}
                </p>
              </div>
              <div>
                <p className="workout-hr-panel__stat-label font-mono">Max</p>
                <p className="workout-hr-panel__stat-value font-mono">
                  {sampleCount > 0 ? maxHr : '—'}
                </p>
              </div>
              <div>
                <p className="workout-hr-panel__stat-label font-mono">Samples</p>
                <p className="workout-hr-panel__stat-value font-mono">{sampleCount}</p>
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
              Amazfit: enable Heart Rate Push, then Connect HR. Avg/max save with the
              workout.
            </p>
            <label className="workout-hr-panel__maxhr font-sans">
              Max HR
              <input
                type="number"
                min={100}
                max={230}
                value={maxHrSetting}
                onChange={(e) => setMaxHrSetting(Number(e.target.value) || 184)}
                className="ml-2 w-16 bg-bg3 border border-border text-text font-mono text-sm px-2 py-1 rounded-card"
              />
            </label>
          </div>
        </div>
      </>
    );
  }
);
