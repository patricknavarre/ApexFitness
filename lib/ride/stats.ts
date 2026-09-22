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

/** Solid zone palette for ladders / accents. */
export const HR_ZONE_COLORS: Record<HrZone, string> = {
  1: '#508cc8',
  2: '#46b478',
  3: '#dcb43c',
  4: '#e67832',
  5: '#dc3c46',
};

/** Sky / overlay wash — stronger than the old FPV tint. */
export const HR_ZONE_TINT: Record<HrZone, string> = {
  1: 'rgba(80, 140, 200, 0.28)',
  2: 'rgba(70, 180, 120, 0.32)',
  3: 'rgba(220, 180, 60, 0.36)',
  4: 'rgba(230, 120, 50, 0.42)',
  5: 'rgba(220, 60, 70, 0.48)',
};

/** Frame border / glow driven by active zone. */
export const HR_ZONE_GLOW: Record<HrZone, string> = {
  1: 'rgba(80, 140, 200, 0.55)',
  2: 'rgba(70, 180, 120, 0.55)',
  3: 'rgba(220, 180, 60, 0.55)',
  4: 'rgba(230, 120, 50, 0.6)',
  5: 'rgba(220, 60, 70, 0.65)',
};

export const HR_ZONES: HrZone[] = [1, 2, 3, 4, 5];

export const WORLD_PANEL_STORAGE_KEY = 'apex.ride.worldPanel';

export type WorldPanelMode = 'docked' | 'expanded';

export type WorldPanelState = {
  mode: WorldPanelMode;
  x: number;
  y: number;
};

const DEFAULT_WORLD_PANEL: WorldPanelState = {
  mode: 'docked',
  x: 24,
  y: 48,
};

export function loadWorldPanelState(): WorldPanelState {
  if (typeof window === 'undefined') return { ...DEFAULT_WORLD_PANEL };
  try {
    const raw = window.localStorage.getItem(WORLD_PANEL_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WORLD_PANEL };
    const parsed = JSON.parse(raw) as Partial<WorldPanelState>;
    const mode: WorldPanelMode =
      parsed.mode === 'expanded' ? 'expanded' : 'docked';
    const x =
      typeof parsed.x === 'number' && Number.isFinite(parsed.x)
        ? parsed.x
        : DEFAULT_WORLD_PANEL.x;
    const y =
      typeof parsed.y === 'number' && Number.isFinite(parsed.y)
        ? parsed.y
        : DEFAULT_WORLD_PANEL.y;
    return { mode, x, y };
  } catch {
    return { ...DEFAULT_WORLD_PANEL };
  }
}

export function saveWorldPanelState(state: WorldPanelState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    WORLD_PANEL_STORAGE_KEY,
    JSON.stringify({
      mode: state.mode === 'expanded' ? 'expanded' : 'docked',
      x: Math.round(state.x),
      y: Math.round(state.y),
    })
  );
}

export function defaultMaxHrFromAge(age: number | null | undefined): number {
  if (typeof age === 'number' && age >= 10 && age <= 100) {
    return Math.round(220 - age);
  }
  return 184;
}

export const FTP_STORAGE_KEY = 'apex.ride.ftp';
export const MAX_HR_STORAGE_KEY = 'apex.ride.maxHr';
export const SPEED_UNIT_STORAGE_KEY = 'apex.ride.speedUnit';

export type SpeedUnit = 'kmh' | 'mph';

const KMH_TO_MPH = 0.621371;

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

export function loadSpeedUnit(): SpeedUnit {
  if (typeof window === 'undefined') return 'kmh';
  return window.localStorage.getItem(SPEED_UNIT_STORAGE_KEY) === 'mph'
    ? 'mph'
    : 'kmh';
}

export function saveSpeedUnit(unit: SpeedUnit) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SPEED_UNIT_STORAGE_KEY, unit);
}

export function toggleSpeedUnit(unit: SpeedUnit): SpeedUnit {
  return unit === 'kmh' ? 'mph' : 'kmh';
}

export function speedUnitLabel(unit: SpeedUnit): string {
  return unit === 'mph' ? 'mph' : 'km/h';
}

/** Display-only conversion; trainer data stays in km/h. */
export function speedInUnit(speedKmh: number, unit: SpeedUnit): number {
  const v = Math.max(0, speedKmh);
  return unit === 'mph' ? v * KMH_TO_MPH : v;
}

export function formatSpeed(
  speedKmh: number,
  unit: SpeedUnit,
  digits = 0
): string {
  const v = speedInUnit(speedKmh, unit);
  const n = digits <= 0 ? String(Math.round(v)) : v.toFixed(digits);
  return `${n} ${speedUnitLabel(unit)}`;
}
