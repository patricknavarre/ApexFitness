'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  haversineMiles,
  mpsToMph,
  pathDistanceMiles,
  type GeoPoint,
} from '@/lib/geo';

const MAX_ACCURACY_M = 50;
/** Ignore tiny GPS jitter under ~8 feet. */
const MIN_MOVE_MILES = 0.0015;
/** Drop absurd derived speeds (e.g. GPS teleport). */
const MAX_SPEED_MPH = 80;
/** Fade current speed to 0 after this many ms without a useful update. */
const SPEED_STALE_MS = 4000;

export type LiveGpsStatus = 'idle' | 'watching' | 'paused' | 'error';

type UseLiveGpsResult = {
  status: LiveGpsStatus;
  points: GeoPoint[];
  distanceMiles: number;
  elapsedMs: number;
  /** Instantaneous speed in mph (0 when paused / idle / stale). */
  speedMph: number;
  error: string | null;
  current: GeoPoint | null;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => GeoPoint[];
  reset: () => void;
};

export function useLiveGps(): UseLiveGpsResult {
  const [status, setStatus] = useState<LiveGpsStatus>('idle');
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [distanceMiles, setDistanceMiles] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [speedMph, setSpeedMph] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<GeoPoint | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const pointsRef = useRef<GeoPoint[]>([]);
  const pausedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const pausedAccumRef = useRef(0);
  const pauseStartedAtRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSpeedAtRef = useRef<number>(0);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current != null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const updateElapsed = useCallback(() => {
    if (startedAtRef.current == null) {
      setElapsedMs(0);
      return;
    }
    const now = Date.now();
    let pausedExtra = pausedAccumRef.current;
    if (pauseStartedAtRef.current != null) {
      pausedExtra += now - pauseStartedAtRef.current;
    }
    setElapsedMs(Math.max(0, now - startedAtRef.current - pausedExtra));
  }, []);

  const applySpeed = useCallback((mph: number, at: number) => {
    if (!Number.isFinite(mph) || mph < 0) return;
    const clamped = Math.min(mph, MAX_SPEED_MPH);
    lastSpeedAtRef.current = at;
    setSpeedMph(clamped);
  }, []);

  const onPosition = useCallback((pos: GeolocationPosition) => {
    if (pausedRef.current) return;
    const { latitude: lat, longitude: lng, accuracy, speed } = pos.coords;
    if (typeof accuracy === 'number' && accuracy > MAX_ACCURACY_M) return;

    const now = pos.timestamp || Date.now();
    const point: GeoPoint = { lat, lng, t: now };
    setCurrent(point);

    // Prefer device-reported speed when present (m/s; null/-1 = unavailable).
    if (typeof speed === 'number' && speed >= 0) {
      applySpeed(mpsToMph(speed), now);
    }

    const prev = pointsRef.current;
    if (prev.length > 0) {
      const last = prev[prev.length - 1]!;
      const step = haversineMiles(last, point);
      if (step < MIN_MOVE_MILES) {
        // Still update speed from coords when nearly stationary.
        if (!(typeof speed === 'number' && speed >= 0)) {
          applySpeed(0, now);
        }
        return;
      }

      // Derive speed from segment when device speed is missing.
      if (!(typeof speed === 'number' && speed >= 0)) {
        const dtMs = Math.max(0, point.t - last.t);
        if (dtMs >= 500) {
          const hours = dtMs / 3_600_000;
          applySpeed(hours > 0 ? step / hours : 0, now);
        }
      }
    }

    const next = [...prev, point];
    pointsRef.current = next;
    setPoints(next);
    setDistanceMiles(pathDistanceMiles(next));
  }, [applySpeed]);

  const onError = useCallback((err: GeolocationPositionError) => {
    let message = 'Could not get location';
    if (err.code === err.PERMISSION_DENIED) {
      message = 'Location permission denied. Enable it in browser settings.';
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      message = 'Location unavailable. Try outdoors with a clear sky.';
    } else if (err.code === err.TIMEOUT) {
      message = 'Location timed out. Try again.';
    }
    setError(message);
    setStatus('error');
    clearWatch();
    clearTick();
  }, [clearTick, clearWatch]);

  const startWatch = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      setStatus('error');
      return;
    }
    clearWatch();
    watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 15000,
    });
  }, [clearWatch, onError, onPosition]);

  const start = useCallback(() => {
    setError(null);
    pointsRef.current = [];
    setPoints([]);
    setDistanceMiles(0);
    setSpeedMph(0);
    lastSpeedAtRef.current = 0;
    setCurrent(null);
    pausedRef.current = false;
    pausedAccumRef.current = 0;
    pauseStartedAtRef.current = null;
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setStatus('watching');
    startWatch();
    clearTick();
    tickRef.current = setInterval(() => {
      updateElapsed();
      if (
        lastSpeedAtRef.current > 0 &&
        Date.now() - lastSpeedAtRef.current > SPEED_STALE_MS
      ) {
        setSpeedMph(0);
      }
    }, 1000);
  }, [clearTick, startWatch, updateElapsed]);

  const pause = useCallback(() => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    pauseStartedAtRef.current = Date.now();
    setSpeedMph(0);
    setStatus('paused');
    clearWatch();
  }, [clearWatch]);

  const resume = useCallback(() => {
    if (!pausedRef.current) return;
    if (pauseStartedAtRef.current != null) {
      pausedAccumRef.current += Date.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
    }
    pausedRef.current = false;
    setError(null);
    setStatus('watching');
    startWatch();
  }, [startWatch]);

  const stop = useCallback(() => {
    if (pauseStartedAtRef.current != null) {
      pausedAccumRef.current += Date.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
    }
    updateElapsed();
    pausedRef.current = true;
    setSpeedMph(0);
    clearWatch();
    clearTick();
    setStatus('idle');
    return pointsRef.current.slice();
  }, [clearTick, clearWatch, updateElapsed]);

  const reset = useCallback(() => {
    clearWatch();
    clearTick();
    pointsRef.current = [];
    pausedRef.current = false;
    startedAtRef.current = null;
    pausedAccumRef.current = 0;
    pauseStartedAtRef.current = null;
    lastSpeedAtRef.current = 0;
    setPoints([]);
    setDistanceMiles(0);
    setElapsedMs(0);
    setSpeedMph(0);
    setCurrent(null);
    setError(null);
    setStatus('idle');
  }, [clearTick, clearWatch]);

  useEffect(() => {
    return () => {
      clearWatch();
      clearTick();
    };
  }, [clearTick, clearWatch]);

  return {
    status,
    points,
    distanceMiles,
    elapsedMs,
    speedMph,
    error,
    current,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
