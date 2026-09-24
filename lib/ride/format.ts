import type { SpeedUnit } from '@/lib/ride/stats';

const M_TO_MI = 1 / 1609.344;

/** Display-only; stored/trainer distances stay in meters. */
export function formatDistance(
  meters: number,
  unit: SpeedUnit = 'kmh'
): string {
  const m = Math.max(0, meters);
  if (unit === 'mph') {
    return formatMilesFromMeters(m);
  }
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

/** Always miles (for ride history / daily summaries). */
export function formatMilesFromMeters(meters: number): string {
  const m = Math.max(0, meters);
  const mi = m * M_TO_MI;
  if (mi < 0.1) return `${Math.round(m * 3.28084)} ft`;
  return `${mi.toFixed(mi < 10 ? 2 : 1)} mi`;
}

export function metersToMiles(meters: number): number {
  return Math.max(0, meters) * M_TO_MI;
}

export function distanceUnitLabel(unit: SpeedUnit): string {
  return unit === 'mph' ? 'mi' : 'km';
}
