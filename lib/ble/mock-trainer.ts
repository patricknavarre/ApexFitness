import type { IndoorBikeSample } from './parse-indoor-bike';
import type { MetricsHandler, TrainerConnection } from './trainer-client';

/** Simulated FTMS stream + control stubs for UI testing without hardware. */
export function startMockTrainer(onMetrics: MetricsHandler): TrainerConnection {
  let t = 0;
  let targetPower: number | null = null;
  let gradePct = 0;

  const id = window.setInterval(() => {
    t += 1;
    const base =
      targetPower != null
        ? targetPower + (Math.random() * 16 - 8)
        : 160 + 35 * Math.sin(t / 8) + (Math.random() * 16 - 8) + gradePct * 14;
    const powerWatts = Math.max(0, Math.round(base));
    const cadenceRpm = Math.round(85 + 8 * Math.sin(t / 5) + (Math.random() * 4 - 2));
    const speedKmh = Math.max(0, 30 + powerWatts / 45 + Math.sin(t / 12) - gradePct * 1.1);
    const sample: IndoorBikeSample = {
      powerWatts,
      cadenceRpm,
      speedKmh: Math.round(speedKmh * 10) / 10,
      energyKcal: Math.floor(t * 0.25),
      elapsedTimeSec: t,
      resistanceLevel: Math.round(Math.max(0, 8 + gradePct * 1.2)),
    };
    onMetrics(sample);
  }, 1000);

  return {
    deviceId: 'mock',
    deviceName: 'Mock trainer',
    source: 'mock',
    canControl: true,
    requestControl: async () => undefined,
    ensureReady: async () => undefined,
    setTargetPower: async (watts: number) => {
      targetPower = watts;
    },
    setSimulationGrade: async (g: number) => {
      targetPower = null;
      gradePct = g;
    },
    resetControl: async () => {
      targetPower = null;
      gradePct = 0;
    },
    disconnect: () => {
      window.clearInterval(id);
    },
  };
}

/** Simulated HR for testing zones without a watch. */
export function startMockHeartRate(onHr: (bpm: number) => void): {
  deviceName: string;
  disconnect: () => void;
} {
  let t = 0;
  const id = window.setInterval(() => {
    t += 1;
    onHr(Math.round(135 + 18 * Math.sin(t / 12) + (Math.random() * 6 - 3)));
  }, 1000);
  return {
    deviceName: 'Mock HR',
    disconnect: () => window.clearInterval(id),
  };
}
