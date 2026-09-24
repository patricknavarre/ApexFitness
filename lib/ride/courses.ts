/** Built-in virtual hill courses: distance (m) → grade (%). */

export type CoursePoint = {
  /** Cumulative distance along the course in meters */
  d: number;
  /** Road grade percent (positive = climb) */
  g: number;
};

export type RideCourse = {
  id: string;
  name: string;
  blurb: string;
  /** Total length in meters */
  lengthMeters: number;
  /** Approx elevation gain in meters */
  elevationGainM: number;
  difficulty: 'easy' | 'moderate' | 'hard';
  points: CoursePoint[];
};

function course(
  id: string,
  name: string,
  blurb: string,
  difficulty: RideCourse['difficulty'],
  points: CoursePoint[]
): RideCourse {
  const lengthMeters = points[points.length - 1]?.d ?? 0;
  let elevationGainM = 0;
  for (let i = 1; i < points.length; i++) {
    const dd = points[i].d - points[i - 1].d;
    const g = (points[i - 1].g + points[i].g) / 2;
    if (g > 0) elevationGainM += (g / 100) * dd;
  }
  return {
    id,
    name,
    blurb,
    lengthMeters,
    elevationGainM: Math.round(elevationGainM),
    difficulty,
    points,
  };
}

export const RIDE_COURSES: RideCourse[] = [
  course(
    'rolling-10k',
    'Rolling 10K',
    'Gentle rollers — great first virtual hill ride.',
    'easy',
    [
      { d: 0, g: 0 },
      { d: 800, g: 1.5 },
      { d: 1600, g: -1 },
      { d: 2800, g: 2.5 },
      { d: 3600, g: 0 },
      { d: 4800, g: 3 },
      { d: 5600, g: -2 },
      { d: 7000, g: 1 },
      { d: 8200, g: 4 },
      { d: 9000, g: -1.5 },
      { d: 10000, g: 0 },
    ]
  ),
  course(
    'punchy-climbs',
    'Punchy Climbs',
    'Short steep kicks with recoveries between.',
    'moderate',
    [
      { d: 0, g: 0 },
      { d: 500, g: 1 },
      { d: 900, g: 7 },
      { d: 1200, g: -3 },
      { d: 2000, g: 0 },
      { d: 2400, g: 8 },
      { d: 2800, g: -4 },
      { d: 3600, g: 1 },
      { d: 4000, g: 6 },
      { d: 4500, g: -2 },
      { d: 5500, g: 0 },
      { d: 6000, g: 9 },
      { d: 6400, g: -5 },
      { d: 7500, g: 0 },
    ]
  ),
  course(
    'alpine-pass',
    'Alpine Pass',
    'Long sustained climb, false flats, then a screaming descent.',
    'hard',
    [
      { d: 0, g: 0.5 },
      { d: 1000, g: 3 },
      { d: 2500, g: 5 },
      { d: 4000, g: 6.5 },
      { d: 5500, g: 4 },
      { d: 7000, g: 7 },
      { d: 8500, g: 8 },
      { d: 9500, g: 2 },
      { d: 10000, g: 0 },
      { d: 11000, g: -4 },
      { d: 12500, g: -6 },
      { d: 14000, g: -3 },
      { d: 15000, g: 0 },
    ]
  ),
  course(
    'undulating-tempo',
    'Undulating Tempo',
    'Steady 2–4% waves for sweet-spot style efforts.',
    'moderate',
    [
      { d: 0, g: 0 },
      { d: 1000, g: 2 },
      { d: 2000, g: 3.5 },
      { d: 3000, g: 1 },
      { d: 4000, g: 4 },
      { d: 5000, g: 2 },
      { d: 6000, g: 3 },
      { d: 7000, g: 0.5 },
      { d: 8000, g: 3.5 },
      { d: 9000, g: 1.5 },
      { d: 10000, g: 0 },
      { d: 12000, g: 2.5 },
      { d: 14000, g: 0 },
    ]
  ),
  course(
    'valley-loop',
    'Valley Loop',
    'Mostly flat with one mid-ride climb and a fun descent home.',
    'easy',
    [
      { d: 0, g: 0 },
      { d: 3000, g: 0.5 },
      { d: 5000, g: 1 },
      { d: 6500, g: 5 },
      { d: 8000, g: 6 },
      { d: 9000, g: -1 },
      { d: 11000, g: -4 },
      { d: 13000, g: 0 },
      { d: 16000, g: 0.5 },
      { d: 18000, g: 0 },
    ]
  ),
];

export function getRideCourse(id: string | null | undefined): RideCourse | null {
  if (!id) return null;
  return RIDE_COURSES.find((c) => c.id === id) ?? null;
}

/** Interpolate grade at distance along the course. Loops if past the end. */
export function gradeAtDistance(course: RideCourse, distanceMeters: number): number {
  const pts = course.points;
  if (pts.length === 0) return 0;
  const len = course.lengthMeters || pts[pts.length - 1].d;
  if (len <= 0) return pts[0].g;
  let d = distanceMeters % len;
  if (d < 0) d += len;

  if (d <= pts[0].d) return pts[0].g;
  for (let i = 1; i < pts.length; i++) {
    if (d <= pts[i].d) {
      const a = pts[i - 1];
      const b = pts[i];
      const span = b.d - a.d || 1;
      const t = (d - a.d) / span;
      return a.g + (b.g - a.g) * t;
    }
  }
  return pts[pts.length - 1].g;
}

/** Elevation gained from 0 → distanceMeters along the course (loops counted). */
export function elevationGainTo(course: RideCourse, distanceMeters: number): number {
  if (distanceMeters <= 0) return 0;
  const step = 20;
  let gain = 0;
  let prevG = gradeAtDistance(course, 0);
  for (let d = step; d <= distanceMeters; d += step) {
    const g = gradeAtDistance(course, d);
    const avg = (prevG + g) / 2;
    if (avg > 0) gain += (avg / 100) * step;
    prevG = g;
  }
  return gain;
}

export type ElevSample = { d: number; elev: number };

/** Sampled elevation profile for chart overlays (relative meters from start). */
export function elevationProfile(course: RideCourse, samples = 64): ElevSample[] {
  const len = Math.max(1, course.lengthMeters);
  const n = Math.max(8, samples);
  const out: ElevSample[] = [];
  let elev = 0;
  let prevG = gradeAtDistance(course, 0);
  out.push({ d: 0, elev: 0 });
  for (let i = 1; i <= n; i++) {
    const d = (i / n) * len;
    const g = gradeAtDistance(course, d);
    const dd = len / n;
    elev += ((prevG + g) / 2 / 100) * dd;
    out.push({ d, elev });
    prevG = g;
  }
  const minE = Math.min(...out.map((p) => p.elev));
  return out.map((p) => ({ d: p.d, elev: p.elev - minE }));
}

export type CourseSegmentHint = {
  grade: number;
  remainingMeters: number;
  label: string;
};

/** Upcoming stretch until grade changes by ~1% or 400m ahead. */
export function upcomingSegment(
  course: RideCourse,
  distanceMeters: number
): CourseSegmentHint {
  const grade = gradeAtDistance(course, distanceMeters);
  const len = course.lengthMeters || 1;
  const d0 = ((distanceMeters % len) + len) % len;
  let remaining = 400;
  for (let ahead = 25; ahead <= 800; ahead += 25) {
    const g2 = gradeAtDistance(course, distanceMeters + ahead);
    if (Math.abs(g2 - grade) >= 1) {
      remaining = ahead;
      break;
    }
    remaining = ahead;
  }
  const label =
    grade >= 5
      ? 'Steep climb'
      : grade >= 2
        ? 'Climb'
        : grade <= -4
          ? 'Fast descent'
          : grade < -1
            ? 'Descent'
            : 'Flat / rollers';
  return { grade, remainingMeters: remaining, label };
}

export function difficultyLabel(d: RideCourse['difficulty']): string {
  if (d === 'easy') return 'Easy';
  if (d === 'hard') return 'Hard';
  return 'Moderate';
}
