/** Visual motion peaks at this trainer speed (mph). */
export const VISUAL_MAX_MPH = 40;

export const VISUAL_MAX_KMH = VISUAL_MAX_MPH * 1.60934;

/** Road texture scroll velocity (px/s) at VISUAL_MAX_KMH. */
export const ROAD_SCROLL_MAX_PX_S = 200;

export function visualMotionFactor(speedKmh: number): number {
  if (speedKmh <= 0) return 0;
  return Math.min(1, speedKmh / VISUAL_MAX_KMH);
}

export function roadScrollTargetPxS(
  speedKmh: number,
  frozen: boolean
): number {
  if (frozen) return 0;
  return visualMotionFactor(Math.max(0, speedKmh)) * ROAD_SCROLL_MAX_PX_S;
}
