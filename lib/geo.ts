export type GeoPoint = {
  lat: number;
  lng: number;
  t: number;
};

const EARTH_RADIUS_MILES = 3958.8;

/** Great-circle distance in miles between two lat/lng points. */
export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Total path length in miles. */
export function pathDistanceMiles(points: GeoPoint[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMiles(points[i - 1]!, points[i]!);
  }
  return total;
}

/**
 * Downsample a route to at most `maxPoints` while keeping first and last.
 * Evenly spaced indices.
 */
export function downsampleRoute(points: GeoPoint[], maxPoints = 2000): GeoPoint[] {
  if (points.length <= maxPoints) return points;
  if (maxPoints < 2) return points.slice(0, maxPoints);
  const result: GeoPoint[] = [];
  const last = points.length - 1;
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round((i / (maxPoints - 1)) * last);
    result.push(points[idx]!);
  }
  return result;
}

/** Format miles for display (e.g. 0.00 → 2.4 → 12). */
export function formatMiles(miles: number): string {
  if (!Number.isFinite(miles) || miles <= 0) return '0.00';
  if (miles < 10) return miles.toFixed(2);
  return miles.toFixed(1);
}

/** Format elapsed ms as H:MM:SS or M:SS. */
export function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

const MPS_TO_MPH = 2.23693629;

/** Convert meters/second to mph. */
export function mpsToMph(mps: number): number {
  if (!Number.isFinite(mps) || mps < 0) return 0;
  return mps * MPS_TO_MPH;
}

/** Average speed from distance and elapsed time. */
export function avgSpeedMph(distanceMiles: number, elapsedMs: number): number {
  if (!Number.isFinite(distanceMiles) || !Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return 0;
  }
  const hours = elapsedMs / 3_600_000;
  if (hours <= 0) return 0;
  return distanceMiles / hours;
}

/** Format mph for live readout (e.g. 0.0 → 6.2 → 18). */
export function formatMph(mph: number): string {
  if (!Number.isFinite(mph) || mph <= 0) return '0.0';
  if (mph < 10) return mph.toFixed(1);
  return mph.toFixed(0);
}

/**
 * Pace as min/mi from mph (walk/run). Returns null when speed is too low.
 * Example: 6 mph → "10:00"
 */
export function formatPaceMinPerMile(mph: number): string | null {
  if (!Number.isFinite(mph) || mph < 0.5) return null;
  const totalSec = Math.round(3600 / mph);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const MOVE_MODES = [
  { id: 'walking', label: 'Walk', cardioId: 'walking' as const },
  { id: 'running', label: 'Run', cardioId: 'running' as const },
  { id: 'cycling', label: 'Bike', cardioId: 'cycling' as const },
] as const;

export type MoveModeId = (typeof MOVE_MODES)[number]['id'];
