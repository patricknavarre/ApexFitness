/** Visual motion peaks / caps at this trainer speed (mph). */
export const VISUAL_MAX_MPH = 40;

export const VISUAL_MAX_KMH = VISUAL_MAX_MPH * 1.60934;

/**
 * Road texture px advanced per km/h per second (toward viewer).
 * Previous feel was 22 — that read as "flying"; ~12 keeps the same character at ~55%.
 */
export const ROAD_PX_PER_KMH = 12;

/**
 * Scenery SVG playback rate of 1.0 at this speed (matches the asset's default loop pace).
 * At 40 mph (~64 km/h) rate ≈ 2.6 before the cap.
 */
export const SCENERY_REF_KMH = 25;
export const SCENERY_MAX_RATE = 2.5;

export function roadScrollTargetPxS(
  speedKmh: number,
  frozen: boolean
): number {
  if (frozen) return 0;
  const capped = Math.min(Math.max(0, speedKmh), VISUAL_MAX_KMH);
  return capped * ROAD_PX_PER_KMH;
}

export function sceneryPlaybackRate(
  speedKmh: number,
  frozen: boolean
): number {
  if (frozen) return 0;
  const capped = Math.min(Math.max(0, speedKmh), VISUAL_MAX_KMH);
  return Math.min(SCENERY_MAX_RATE, capped / SCENERY_REF_KMH);
}
