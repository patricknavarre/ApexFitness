/** Ride math: NP, TSS, work, HR zones. */

export function workKj(avgPowerWatts: number, durationSeconds: number): number {
  if (avgPowerWatts <= 0 || durationSeconds <= 0) return 0;
  return (avgPowerWatts * durationSeconds) / 1000;
}

/**
 * Approximate Normalized Power from 1 Hz (or near-1 Hz) power samples.
 * Uses 30s rolling mean of power^4, then fourth root of the average of those means.
 */
export function normalizedPower(powerSamples: number[]): number | null {
  if (powerSamples.length < 30) return null;
  const rolling: number[] = [];
  let windowSum4 = 0;
  const window: number[] = [];
  for (const p of powerSamples) {
    const v = Math.max(0, p);
    window.push(v);
    windowSum4 += Math.pow(v, 4);
    if (window.length > 30) {
      const old = window.shift()!;
      windowSum4 -= Math.pow(old, 4);
    }
    if (window.length === 30) {
      rolling.push(windowSum4 / 30);
    }
  }
  if (rolling.length === 0) return null;
  const avg = rolling.reduce((a, b) => a + b, 0) / rolling.length;
  return Math.pow(avg, 0.25);
}

export function intensityFactor(np: number, ftp: number): number | null {
  if (ftp <= 0 || np <= 0) return null;
  return np / ftp;
}

/** Classic Coggan Training Stress Score approximation. */
export function trainingStressScore(
  durationSeconds: number,
  np: number,
  ftp: number
): number | null {
  const iff = intensityFactor(np, ftp);
  if (iff == null || durationSeconds <= 0) return null;
  return ((durationSeconds * np * iff) / (ftp * 3600)) * 100;
}

export type HrZone = 1 | 2 | 3 | 4 | 5;

/** % of max HR zones: Z1 <60, Z2 60–70, Z3 70–80, Z4 80–90, Z5 90+. */
export function hrZone(bpm: number, maxHr: number): HrZone {
  if (maxHr <= 0 || bpm <= 0) return 1;
  const pct = (bpm / maxHr) * 100;
  if (pct < 60) return 1;
  if (pct < 70) return 2;
  if (pct < 80) return 3;
  if (pct < 90) return 4;
  return 5;
}

export function hrZoneLabel(zone: HrZone): string {
  const labels: Record<HrZone, string> = {
    1: 'Z1 Easy',
    2: 'Z2 Endurance',
    3: 'Z3 Tempo',
    4: 'Z4 Threshold',
    5: 'Z5 Max',
  };
  return labels[zone];
}

export function defaultMaxHrFromAge(age: number | null | undefined): number {
  if (typeof age === 'number' && age >= 10 && age <= 100) {
    return Math.round(220 - age);
  }
  return 184;
}

export const FTP_STORAGE_KEY = 'apex.ride.ftp';
export const MAX_HR_STORAGE_KEY = 'apex.ride.maxHr';

export function loadRidePrefs(): { ftp: number; maxHr: number } {
  if (typeof window === 'undefined') return { ftp: 200, maxHr: 184 };
  const ftpRaw = Number(window.localStorage.getItem(FTP_STORAGE_KEY));
  const maxHrRaw = Number(window.localStorage.getItem(MAX_HR_STORAGE_KEY));
  return {
    ftp: Number.isFinite(ftpRaw) && ftpRaw >= 50 && ftpRaw <= 600 ? ftpRaw : 200,
    maxHr:
      Number.isFinite(maxHrRaw) && maxHrRaw >= 100 && maxHrRaw <= 230
        ? maxHrRaw
        : 184,
  };
}

export function saveRidePrefs(ftp: number, maxHr: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FTP_STORAGE_KEY, String(Math.round(ftp)));
  window.localStorage.setItem(MAX_HR_STORAGE_KEY, String(Math.round(maxHr)));
}
