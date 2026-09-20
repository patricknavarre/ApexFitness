import type { IndoorBikeSample } from './parse-indoor-bike';
import type { MetricsHandler, TrainerConnection } from './trainer-client';

/** Simulated FTMS stream for UI testing without hardware / on unsupported browsers. */
export function startMockTrainer(onMetrics: MetricsHandler): TrainerConnection {
  let t = 0;
  const id = window.setInterval(() => {
    t += 1;
    const powerWatts = Math.round(180 + 40 * Math.sin(t / 8) + (Math.random() * 20 - 10));
    const cadenceRpm = Math.round(85 + 8 * Math.sin(t / 5) + (Math.random() * 4 - 2));
    const speedKmh = Math.max(0, 28 + powerWatts / 40 + Math.sin(t / 12));
    const sample: IndoorBikeSample = {
      powerWatts,
      cadenceRpm,
      speedKmh: Math.round(speedKmh * 10) / 10,
      heartRateBpm: Math.round(140 + 10 * Math.sin(t / 15)),
      energyKcal: Math.floor(t * 0.25),
      elapsedTimeSec: t,
    };
    onMetrics(sample);
  }, 1000);

  return {
    deviceId: 'mock',
    deviceName: 'Mock trainer',
    source: 'ftms',
    disconnect: () => {
      window.clearInterval(id);
    },
  };
}
