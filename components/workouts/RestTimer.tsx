'use client';

import { useState, useEffect, useRef } from 'react';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export type RestHrRecovery = {
  exerciseBpm: number;
  restBpm: number;
  /** Exercise HR minus end-of-rest HR (positive = dropped during rest). */
  deltaBpm: number;
};

type Props = {
  visible: boolean;
  duration: number;
  onClose: () => void;
  onDurationChange: (val: number) => void;
  accentColor?: string;
  /** HR when Rest was pressed (end of work set). */
  exerciseHrBpm?: number | null;
  /** Live BPM while the rest overlay is open. */
  liveHrBpm?: number | null;
  /** Fired when the countdown finishes naturally (not Skip). */
  onComplete?: (recovery: RestHrRecovery | null) => void;
};

function averageTail(samples: number[], count = 5): number | null {
  if (samples.length === 0) return null;
  const tail = samples.slice(-count);
  return Math.round(tail.reduce((a, b) => a + b, 0) / tail.length);
}

export function RestTimer({
  visible,
  duration,
  onClose,
  onDurationChange,
  accentColor = '#3b82f6',
  exerciseHrBpm = null,
  liveHrBpm = null,
  onComplete,
}: Props) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [recovery, setRecovery] = useState<RestHrRecovery | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  const onCompleteRef = useRef(onComplete);
  const restSamplesRef = useRef<number[]>([]);
  const exerciseHrRef = useRef<number | null>(null);
  const liveHrRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    liveHrRef.current = liveHrBpm;
  }, [liveHrBpm]);

  useEffect(() => {
    if (!visible) {
      setRunning(false);
      setFinished(false);
      setRecovery(null);
      restSamplesRef.current = [];
      completedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      return;
    }
    setTimeLeft(duration);
    setRunning(true);
    setFinished(false);
    setRecovery(null);
    restSamplesRef.current = [];
    completedRef.current = false;
    exerciseHrRef.current =
      exerciseHrBpm != null && Number.isFinite(exerciseHrBpm) && exerciseHrBpm > 0
        ? Math.round(exerciseHrBpm)
        : null;
  }, [visible, duration, exerciseHrBpm]);

  useEffect(() => {
    if (!visible || !running) return;
    if (liveHrBpm == null || !Number.isFinite(liveHrBpm) || liveHrBpm <= 0) return;
    restSamplesRef.current.push(Math.round(liveHrBpm));
  }, [visible, running, liveHrBpm]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  function buildRecovery(): RestHrRecovery | null {
    const exercise = exerciseHrRef.current;
    const restBpm =
      averageTail(restSamplesRef.current) ??
      (liveHrRef.current != null && liveHrRef.current > 0
        ? Math.round(liveHrRef.current)
        : null);
    if (exercise == null || restBpm == null) return null;
    return {
      exerciseBpm: exercise,
      restBpm,
      deltaBpm: exercise - restBpm,
    };
  }

  const finishNaturally = useRef(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const result = buildRecovery();
    setRecovery(result);
    setFinished(true);
    setRunning(false);
    setTimeLeft(0);
    onCompleteRef.current?.(result);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setFinished(false);
      onCloseRef.current();
    }, result ? 2500 : 1000);
  }).current;

  useEffect(() => {
    if (!running || timeLeft <= 0) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // Defer side effects out of the updater
          queueMicrotask(() => finishNaturally());
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, timeLeft, finishNaturally]);

  function handleSkip() {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setFinished(false);
    setRecovery(null);
    completedRef.current = true;
    onClose();
  }

  if (!visible) return null;

  const progress = duration > 0 ? timeLeft / duration : 0;
  const circumference = 2 * Math.PI * 54;
  const tickLabels = ['0:30', '1:00', '1:30', '2:00', '2:30', '3:00', '3:30', '4:00', '4:30', '5:00'];
  const showHr = exerciseHrBpm != null || liveHrBpm != null || recovery != null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-black/80 p-6">
      <div className="relative h-[140px] w-[140px]">
        <svg width="140" height="140" className="-rotate-90">
          <circle cx="70" cy="70" r="54" fill="none" stroke="#1e293b" strokeWidth="8" />
          <circle
            cx="70"
            cy="70"
            r="54"
            fill="none"
            stroke={finished ? '#4ade80' : accentColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={`font-mono text-4xl font-extrabold tracking-tight transition-colors duration-200 ${
              finished ? 'text-green-400' : 'text-text'
            }`}
          >
            {formatTime(timeLeft)}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">rest</div>
        </div>
      </div>

      {showHr ? (
        <div className="w-full max-w-[280px] rounded-card border border-border bg-card/80 px-4 py-3 text-center">
          {recovery ? (
            <>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">
                HR recovery
              </p>
              <p className="font-mono text-sm text-text">
                <span className="text-accent">{recovery.exerciseBpm}</span>
                <span className="text-muted"> → </span>
                <span className="text-green-400">{recovery.restBpm}</span>
                <span className="text-muted"> bpm</span>
              </p>
              <p
                className={`mt-1 font-mono text-lg font-bold ${
                  recovery.deltaBpm >= 0 ? 'text-green-400' : 'text-accent2'
                }`}
              >
                {recovery.deltaBpm >= 0 ? '↓' : '↑'} {Math.abs(recovery.deltaBpm)} bpm
              </p>
            </>
          ) : (
            <div className="flex items-center justify-center gap-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Work</p>
                <p className="font-mono text-xl font-bold text-accent">
                  {exerciseHrBpm != null ? Math.round(exerciseHrBpm) : '—'}
                </p>
              </div>
              <div className="font-mono text-muted">→</div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Rest</p>
                <p className="font-mono text-xl font-bold text-text">
                  {liveHrBpm != null ? Math.round(liveHrBpm) : '—'}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="font-sans text-xs text-muted text-center max-w-[260px]">
          Connect a heart rate monitor to measure work vs rest recovery.
        </p>
      )}

      <p className="font-sans text-sm text-muted">
        Rest duration:{' '}
        <strong className="text-text">{formatTime(duration)}</strong>
      </p>

      <div className="w-full max-w-[280px]">
        <input
          type="range"
          min={30}
          max={300}
          step={30}
          value={duration}
          onChange={(e) => {
            const val = Number(e.target.value);
            onDurationChange(val);
            setTimeLeft(val);
            setRunning(false);
            setFinished(false);
            setRecovery(null);
            completedRef.current = false;
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
          }}
          className="w-full"
          style={{ accentColor }}
        />
        <div className="mt-1 flex justify-between">
          {tickLabels.map((l) => (
            <span key={l} className="text-[8px] text-muted">
              {l}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
            setFinished(false);
            setRecovery(null);
            restSamplesRef.current = [];
            completedRef.current = false;
            setTimeLeft(duration);
            setRunning(true);
          }}
          className="min-h-[44px] rounded-card px-6 py-3 font-sans text-sm font-bold text-black"
          style={{ backgroundColor: accentColor }}
        >
          Restart
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="min-h-[44px] rounded-card border border-border bg-transparent px-6 py-3 font-sans text-sm font-bold text-muted hover:border-accent"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
