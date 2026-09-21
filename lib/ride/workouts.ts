/** Built-in structured ERG workouts (% of FTP × timed segments). */

export type WorkoutSegment = {
  name: string;
  durationSec: number;
  /** Target as fraction of FTP (1 = 100% FTP). */
  ftpPercent: number;
};

export type RideWorkout = {
  id: string;
  name: string;
  blurb: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  tags: string[];
  segments: WorkoutSegment[];
};

function workout(
  id: string,
  name: string,
  blurb: string,
  difficulty: RideWorkout['difficulty'],
  tags: string[],
  segments: WorkoutSegment[]
): RideWorkout {
  return { id, name, blurb, difficulty, tags, segments };
}

function warmUp(): WorkoutSegment[] {
  return [
    { name: 'Warm-up easy', durationSec: 5 * 60, ftpPercent: 0.5 },
    { name: 'Warm-up spin-ups', durationSec: 3 * 60, ftpPercent: 0.65 },
  ];
}

function coolDown(): WorkoutSegment {
  return { name: 'Cool-down', durationSec: 5 * 60, ftpPercent: 0.45 };
}

function repeats(
  count: number,
  work: WorkoutSegment,
  rest: WorkoutSegment
): WorkoutSegment[] {
  const out: WorkoutSegment[] = [];
  for (let i = 1; i <= count; i++) {
    out.push({ ...work, name: `${work.name} ${i}/${count}` });
    if (i < count) out.push({ ...rest, name: `${rest.name} ${i}/${count}` });
  }
  return out;
}

export const RIDE_WORKOUTS: RideWorkout[] = [
  workout(
    'sprint-repeats',
    'Sprint Repeats',
    'Neuromuscular bursts — 30s all-out with long recoveries.',
    'hard',
    ['sprints', 'anaerobic'],
    [
      ...warmUp(),
      ...repeats(
        8,
        { name: 'Sprint', durationSec: 30, ftpPercent: 1.5 },
        { name: 'Recovery', durationSec: 90, ftpPercent: 0.45 }
      ),
      coolDown(),
    ]
  ),
  workout(
    'sweet-spot',
    'Sweet Spot',
    'Comfortably hard blocks at ~88% FTP — aerobic engine builder.',
    'moderate',
    ['sweet-spot', 'endurance'],
    [
      ...warmUp(),
      { name: 'Sweet spot 1', durationSec: 8 * 60, ftpPercent: 0.88 },
      { name: 'Recover', durationSec: 4 * 60, ftpPercent: 0.5 },
      { name: 'Sweet spot 2', durationSec: 8 * 60, ftpPercent: 0.88 },
      { name: 'Recover', durationSec: 4 * 60, ftpPercent: 0.5 },
      { name: 'Sweet spot 3', durationSec: 8 * 60, ftpPercent: 0.88 },
      coolDown(),
    ]
  ),
  workout(
    'threshold-2x12',
    'Threshold 2×12',
    'Classic FTP intervals — hold ~100% with full recoveries.',
    'hard',
    ['threshold', 'ftp'],
    [
      ...warmUp(),
      { name: 'Threshold 1', durationSec: 12 * 60, ftpPercent: 1.0 },
      { name: 'Recover', durationSec: 5 * 60, ftpPercent: 0.5 },
      { name: 'Threshold 2', durationSec: 12 * 60, ftpPercent: 1.0 },
      coolDown(),
    ]
  ),
  workout(
    'vo2-hiit',
    'VO₂ / HIIT',
    '3-minute hard efforts at 120% FTP — max aerobic power.',
    'hard',
    ['vo2', 'hiit'],
    [
      ...warmUp(),
      ...repeats(
        5,
        { name: 'VO₂', durationSec: 3 * 60, ftpPercent: 1.2 },
        { name: 'Recover', durationSec: 3 * 60, ftpPercent: 0.5 }
      ),
      coolDown(),
    ]
  ),
  workout(
    'tempo-cruise',
    'Tempo Cruise',
    'Steady tempo at ~76% FTP — zone 3 endurance.',
    'moderate',
    ['tempo', 'zone3'],
    [
      ...warmUp(),
      { name: 'Tempo', durationSec: 20 * 60, ftpPercent: 0.76 },
      { name: 'Easy', durationSec: 3 * 60, ftpPercent: 0.5 },
      { name: 'Tempo', durationSec: 15 * 60, ftpPercent: 0.78 },
      coolDown(),
    ]
  ),
  workout(
    'endurance-spin',
    'Endurance Spin',
    'Easy aerobic base — keep it conversational.',
    'easy',
    ['endurance', 'zone2'],
    [
      { name: 'Easy start', durationSec: 5 * 60, ftpPercent: 0.5 },
      { name: 'Endurance', durationSec: 35 * 60, ftpPercent: 0.6 },
      coolDown(),
    ]
  ),
];

export function getRideWorkout(id: string | null | undefined): RideWorkout | null {
  if (!id) return null;
  return RIDE_WORKOUTS.find((w) => w.id === id) ?? null;
}

export function workoutTotalSeconds(workout: RideWorkout): number {
  return workout.segments.reduce((sum, s) => sum + s.durationSec, 0);
}

export function targetWatts(ftp: number, ftpPercent: number): number {
  return Math.max(40, Math.round(ftp * ftpPercent));
}

export type WorkoutProgress = {
  segmentIndex: number;
  segment: WorkoutSegment;
  segmentElapsedSec: number;
  segmentRemainingSec: number;
  overallElapsedSec: number;
  overallRemainingSec: number;
  overallProgressPct: number;
  targetWatts: number;
  done: boolean;
};

/** Resolve which interval is active given elapsed ride seconds. */
export function workoutProgressAt(
  workout: RideWorkout,
  elapsedSec: number,
  ftp: number
): WorkoutProgress {
  const total = workoutTotalSeconds(workout);
  let t = Math.max(0, elapsedSec);
  let idx = 0;
  let cursor = 0;
  for (; idx < workout.segments.length; idx++) {
    const seg = workout.segments[idx];
    if (t < cursor + seg.durationSec) {
      const segmentElapsed = t - cursor;
      return {
        segmentIndex: idx,
        segment: seg,
        segmentElapsedSec: segmentElapsed,
        segmentRemainingSec: Math.max(0, seg.durationSec - segmentElapsed),
        overallElapsedSec: Math.min(t, total),
        overallRemainingSec: Math.max(0, total - t),
        overallProgressPct: Math.min(100, Math.round((Math.min(t, total) / total) * 100)),
        targetWatts: targetWatts(ftp, seg.ftpPercent),
        done: false,
      };
    }
    cursor += seg.durationSec;
  }
  const last = workout.segments[workout.segments.length - 1];
  return {
    segmentIndex: workout.segments.length - 1,
    segment: last,
    segmentElapsedSec: last.durationSec,
    segmentRemainingSec: 0,
    overallElapsedSec: total,
    overallRemainingSec: 0,
    overallProgressPct: 100,
    targetWatts: targetWatts(ftp, last.ftpPercent),
    done: t >= total,
  };
}
