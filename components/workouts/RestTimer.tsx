'use client';

import { useState, useEffect, useRef } from 'react';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Props = {
  visible: boolean;
  duration: number;
  onClose: () => void;
  onDurationChange: (val: number) => void;
  accentColor?: string;
};

export function RestTimer({
  visible,
  duration,
  onClose,
  onDurationChange,
  accentColor = '#3b82f6',
}: Props) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setTimeLeft(duration);
      setRunning(true);
    } else {
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [visible, duration]);

  useEffect(() => {
    if (running && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setRunning(false);
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, timeLeft]);

  if (!visible) return null;

  const progress = duration > 0 ? timeLeft / duration : 0;
  const circumference = 2 * Math.PI * 54;
  const tickLabels = ['0:30', '1:00', '1:30', '2:00', '2:30', '3:00', '3:30', '4:00', '4:30', '5:00'];

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
            stroke={accentColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-mono text-4xl font-extrabold tracking-tight text-text">
            {formatTime(timeLeft)}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">rest</div>
        </div>
      </div>

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
            setTimeLeft(duration);
            setRunning(true);
          }}
          className="rounded-card px-5 py-2.5 font-sans text-sm font-bold text-black"
          style={{ backgroundColor: accentColor }}
        >
          Restart
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-card border border-border bg-transparent px-5 py-2.5 font-sans text-sm font-bold text-muted hover:border-accent"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
