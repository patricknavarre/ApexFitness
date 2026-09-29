/**
 * Scenery playback: freeze via CSS, speed via updatePlaybackRate.
 * Rate is driven from the same eased road velocity so layers stay locked.
 * Pause/resume uses hysteresis; rate updates no-op unless meaningfully changed
 * (updating ~500 SVG animations every frame flashes the whole scene).
 */

/** Freeze when rate drops below this (must be below RESUME_ABOVE). */
const PAUSE_BELOW = 0.04;
/** Unfreeze only after rate rises above this (hysteresis vs BLE/ease jitter). */
const RESUME_ABOVE = 0.08;
/** Ignore tiny rate jitter so we do not thrash Web Animations. */
const RATE_EPSILON = 0.05;

export type SceneryPlaybackState = {
  frozen: boolean;
  appliedRate: number;
  animations: Animation[] | null;
};

export function createSceneryPlaybackState(): SceneryPlaybackState {
  return { frozen: true, appliedRate: 0, animations: null };
}

function ensureAnimations(
  root: HTMLElement,
  state: SceneryPlaybackState
): Animation[] {
  if (!state.animations || state.animations.length === 0) {
    state.animations = root.getAnimations({ subtree: true });
  }
  return state.animations;
}

export function setSceneryFrozen(
  root: HTMLElement,
  frozen: boolean,
  state: SceneryPlaybackState
): void {
  if (state.frozen === frozen) return;
  state.frozen = frozen;
  root.classList.toggle('ride-world__scenery--frozen', frozen);

  const animations = ensureAnimations(root, state);
  if (frozen) {
    animations.forEach((a) => {
      try {
        a.pause();
      } catch {
        /* ignore */
      }
    });
    state.appliedRate = 0;
    return;
  }

  animations.forEach((a) => {
    try {
      if (a.playState === 'paused') a.play();
    } catch {
      /* ignore */
    }
  });
}

/**
 * Desired scenery rate from road velocity (0 = stop).
 * Applies freeze hysteresis, then updatePlaybackRate only on real changes.
 */
export function setSceneryRate(
  root: HTMLElement,
  rate: number,
  state: SceneryPlaybackState
): void {
  const next = Math.max(0, rate);

  if (state.frozen) {
    if (next < RESUME_ABOVE) return;
    setSceneryFrozen(root, false, state);
  } else if (next < PAUSE_BELOW) {
    setSceneryFrozen(root, true, state);
    return;
  }

  if (state.frozen) return;
  if (Math.abs(next - state.appliedRate) < RATE_EPSILON) return;
  state.appliedRate = next;

  const animations = ensureAnimations(root, state);
  animations.forEach((a) => {
    try {
      a.updatePlaybackRate(Math.max(PAUSE_BELOW, next));
    } catch {
      /* ignore */
    }
  });
}
