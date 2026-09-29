const PAUSE_BELOW = 0.04;
const RESUME_ABOVE = 0.08;
/** Ignore tiny speed jitter so we do not thrash Web Animations every frame. */
const RATE_EPSILON = 0.03;

export type SceneryPlaybackState = {
  lastRate: number;
  paused: boolean;
  animations: Animation[] | null;
};

export function createSceneryPlaybackState(): SceneryPlaybackState {
  return { lastRate: -1, paused: true, animations: null };
}

function collectAnimations(root: HTMLElement): Animation[] {
  return root.getAnimations({ subtree: true });
}

/**
 * Apply a playback rate to the scenery SVG. Safe to call often — no-ops unless
 * the rate actually changed. Pausing/playing uses hysteresis so BLE jitter near
 * zero does not flash the whole scene.
 */
export function applySceneryPlaybackRate(
  root: HTMLElement,
  rate: number,
  state: SceneryPlaybackState
): void {
  const target = rate <= 0 ? 0 : rate;

  if (
    state.lastRate >= 0 &&
    Math.abs(target - state.lastRate) < RATE_EPSILON &&
    !(state.paused && target >= RESUME_ABOVE) &&
    !(!state.paused && target < PAUSE_BELOW)
  ) {
    return;
  }

  if (!state.animations || state.animations.length === 0) {
    state.animations = collectAnimations(root);
  }

  const animations = state.animations;
  if (animations.length === 0) return;

  const shouldPause = target < PAUSE_BELOW;
  state.lastRate = target;

  if (shouldPause) {
    if (!state.paused) {
      animations.forEach((a) => {
        try {
          a.pause();
        } catch {
          /* animation may have been GC'd */
        }
      });
      state.paused = true;
    }
    return;
  }

  animations.forEach((a) => {
    try {
      if (state.paused || a.playState === 'paused') a.play();
      a.updatePlaybackRate(target);
    } catch {
      /* animation may have been GC'd */
    }
  });
  state.paused = false;
}
