const PAUSE_RATE_THRESHOLD = 0.05;

export function applySceneryPlaybackRate(
  root: HTMLElement,
  rate: number
): void {
  const r = rate <= 0 ? 0 : rate;
  root.getAnimations({ subtree: true }).forEach((a) => {
    if (r < PAUSE_RATE_THRESHOLD) {
      a.pause();
      return;
    }
    if (a.playState === 'paused') a.play();
    a.updatePlaybackRate(r);
  });
}
