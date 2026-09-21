/** Ride XP, levels, and badge helpers. */

export type RideXpInput = {
  durationSeconds: number;
  trainingStressScore?: number | null;
  workKj?: number | null;
  avgHeartRateBpm?: number | null;
  usedErg?: boolean;
  isFirstRideEver?: boolean;
};

export type RideLevel = {
  level: number;
  title: string;
  xpIntoLevel: number;
  xpForNext: number;
  totalXp: number;
  progressPct: number;
};

const LEVEL_TITLES = [
  'Rooftop Roller',
  'Garage Grinder',
  'Watt Rookie',
  'Cadence Cadet',
  'ERG Apprentice',
  'Threshold Tinkerer',
  'Climb Climber',
  'Pack Rider',
  'Watt Wizard',
  'Virtual Contender',
  'Apex Rider',
];

/** Cumulative XP required to reach each level (level 1 starts at 0). */
export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5800, 7800];

export function xpFromRide(input: RideXpInput): number {
  const minutes = Math.max(0, input.durationSeconds) / 60;
  let xp = Math.round(minutes * 2);
  if (typeof input.trainingStressScore === 'number' && input.trainingStressScore > 0) {
    xp += Math.round(input.trainingStressScore);
  }
  if (typeof input.workKj === 'number' && input.workKj > 0) {
    xp += Math.round(input.workKj / 8);
  }
  if (typeof input.avgHeartRateBpm === 'number' && input.avgHeartRateBpm > 0) {
    xp += 15;
  }
  if (input.usedErg) xp += 20;
  if (input.isFirstRideEver) xp += 50;
  return Math.max(1, xp);
}

export function levelFromXp(totalXp: number): RideLevel {
  const xp = Math.max(0, Math.round(totalXp));
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  const floor = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const next = LEVEL_THRESHOLDS[level] ?? floor + 2000;
  const xpIntoLevel = xp - floor;
  const xpForNext = Math.max(1, next - floor);
  const title =
    LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)] ?? 'Apex Rider';
  return {
    level,
    title,
    xpIntoLevel,
    xpForNext,
    totalXp: xp,
    progressPct: Math.min(100, Math.round((xpIntoLevel / xpForNext) * 100)),
  };
}

export type RideBadgeStats = {
  totalRides: number;
  longestRideMinutes: number;
  bestTss: number;
  ridesWithHr: number;
  ridesWithErg: number;
  totalRideXp: number;
};

export function emptyRideBadgeStats(): RideBadgeStats {
  return {
    totalRides: 0,
    longestRideMinutes: 0,
    bestTss: 0,
    ridesWithHr: 0,
    ridesWithErg: 0,
    totalRideXp: 0,
  };
}
