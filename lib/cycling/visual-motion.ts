/** Visual motion peaks / caps at this trainer speed (mph). */
export const VISUAL_MAX_MPH = 40;

export const VISUAL_MAX_KMH = VISUAL_MAX_MPH * 1.60934;

/**
 * Road texture px advanced per km/h per second (toward viewer).
 * Classic FPV feel before the SVG scenery experiment.
 */
export const ROAD_PX_PER_KMH = 22;

/** Road scroll px/s at VISUAL_MAX_KMH. */
export const ROAD_SCROLL_MAX_PX_S = VISUAL_MAX_KMH * ROAD_PX_PER_KMH;

export function roadScrollTargetPxS(
  speedKmh: number,
  frozen: boolean
): number {
  if (frozen) return 0;
  const capped = Math.min(Math.max(0, speedKmh), VISUAL_MAX_KMH);
  return capped * ROAD_PX_PER_KMH;
}
