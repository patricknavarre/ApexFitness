/**
 * Scenery playback: freeze via CSS, speed via updatePlaybackRate.
 * Rate is driven from the same eased road velocity so layers stay locked.
 * Only applies when the rate actually changes (avoids mid-ride flash).
 */

const RATE_EPSILON = 0.04;

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

/** While unfrozen, set playback rate from the shared road-velocity factor. */
export function setSceneryRate(
  root: HTMLElement,
  rate: number,
  state: SceneryPlaybackState
): void {
  if (state.frozen) return;
  const next = Math.max(0, rate);
  if (Math.abs(next - state.appliedRate) < RATE_EPSILON) return;
  state.appliedRate = next;

  const animations = ensureAnimations(root, state);
  animations.forEach((a) => {
    try {
      a.updatePlaybackRate(Math.max(0.05, next));
    } catch {
      /* ignore */
    }
  });
}
