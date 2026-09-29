/** Visual motion peaks / caps at this trainer speed (mph). */
export const VISUAL_MAX_MPH = 40;

export const VISUAL_MAX_KMH = VISUAL_MAX_MPH * 1.60934;

/**
 * Road texture px advanced per km/h per second (toward viewer).
 * Pre-scenery value was 22 (felt too fast). 14 keeps similar character, calmer.
 */
export const ROAD_PX_PER_KMH = 14;

/** Road scroll px/s at VISUAL_MAX_KMH — shared ceiling for road + scenery. */
export const ROAD_SCROLL_MAX_PX_S = VISUAL_MAX_KMH * ROAD_PX_PER_KMH;

/**
 * Scenery Web Animations playbackRate at full visual speed.
 * 1.0 ≈ the SVG's authored default; 2.0 at 40 mph still reads clearly.
 */
export const SCENERY_RATE_AT_MAX = 2;

export function roadScrollTargetPxS(
  speedKmh: number,
  frozen: boolean
): number {
  if (frozen) return 0;
  const capped = Math.min(Math.max(0, speedKmh), VISUAL_MAX_KMH);
  return capped * ROAD_PX_PER_KMH;
}

/** Map current road scroll velocity → scenery playback rate (same 0–1 factor). */
export function sceneryRateFromRoadVelocity(velocityPxS: number): number {
  if (velocityPxS <= 0 || ROAD_SCROLL_MAX_PX_S <= 0) return 0;
  const factor = Math.min(1, velocityPxS / ROAD_SCROLL_MAX_PX_S);
  return factor * SCENERY_RATE_AT_MAX;
}
