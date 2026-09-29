/**
 * Scenery playback without WAAPI rate thrashing.
 *
 * The SVG uses CSS animations (`animation-duration: calc(var(--speed) * …)`).
 * Calling updatePlaybackRate() on hundreds of CSSAnimation objects every few
 * frames flashes the whole scene (especially Safari). Instead:
 *  - freeze/unfreeze via a CSS class only
 *  - keep a stable --speed while riding (road layer carries variable speed feel)
 */

/** --speed is inverted vs playback rate: lower = faster (see SVG comment). */
export const SCENERY_CRUISE_SPEED_VAR = 0.75;

export type SceneryPlaybackState = {
  frozen: boolean;
};

export function createSceneryPlaybackState(): SceneryPlaybackState {
  return { frozen: true };
}

function scenerySvg(root: HTMLElement): SVGElement | null {
  return root.querySelector('svg');
}

export function setSceneryFrozen(
  root: HTMLElement,
  frozen: boolean,
  state: SceneryPlaybackState
): void {
  if (state.frozen === frozen) return;
  state.frozen = frozen;
  root.classList.toggle('ride-world__scenery--frozen', frozen);

  const svg = scenerySvg(root);
  if (!svg) return;

  if (frozen) {
    // Leave --speed alone while frozen so resume continues the same timeline.
    return;
  }

  // Stable cruise speed — do not retune mid-ride (retuning restarts animations).
  svg.style.setProperty('--speed', String(SCENERY_CRUISE_SPEED_VAR));
}

/**
 * Kept for RideWorld API compatibility. Variable trainer speed is expressed on
 * the road layer; scenery stays at a constant cruise while unfrozen.
 */
export function setSceneryRate(
  _root: HTMLElement,
  _rate: number,
  _state: SceneryPlaybackState
): void {
  /* no-op — WAAPI rate updates cause mid-ride flash */
}
