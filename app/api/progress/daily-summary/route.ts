import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import NutritionLog from '@/models/NutritionLog';
import WorkoutLog from '@/models/WorkoutLog';

const DEFAULT_CALORIES_BURNED = 270;
/** App users are US-based; Progress day labels should match local workout evenings. */
const APP_TZ = 'America/New_York';

function startOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function toZonedDateString(d: Date, timeZone = APP_TZ): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + delta, 12, 0, 0));
  return utc.toISOString().slice(0, 10);
}

type SessionWorkout = {
  planId: string | null;
  dayNumber: number | null;
  caloriesBurned: number;
  cardioExercise: string | null;
  cardioDurationMinutes: number | null;
  distanceMiles: number | null;
  distanceMeters: number | null;
  isRestDay: boolean;
  rideSource: string | null;
  avgPowerWatts: number | null;
  trainingStressScore: number | null;
  rideXp: number | null;
  courseId: string | null;
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const daysParam = Number(searchParams.get('days')) || 7;
  const days = Math.min(14, Math.max(1, daysParam));

  try {
    await connectDB();
    const userId = session.user.id;

    const todayYmd = toZonedDateString(new Date());
    const dateStrings: string[] = [];
    for (let i = 0; i < days; i++) {
      dateStrings.push(addDaysYmd(todayYmd, -i));
    }

    const rangeStart = new Date(startOfDay(dateStrings[dateStrings.length - 1]!));
    rangeStart.setUTCDate(rangeStart.getUTCDate() - 1);
    const rangeEnd = new Date(endOfDay(dateStrings[0]!));
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

    const [allNutrition, allWorkouts] = await Promise.all([
      NutritionLog.find({
        userId,
        logDate: {
          $gte: startOfDay(dateStrings[dateStrings.length - 1]!),
          $lte: endOfDay(dateStrings[0]!),
        },
      })
        .select('calories logDate')
        .lean(),
      WorkoutLog.find({
        userId,
        loggedAt: { $gte: rangeStart, $lte: rangeEnd },
      })
        .select(
          'planId dayNumber caloriesBurned cardioExercise cardioDurationMinutes distanceMiles distanceMeters isRestDay exerciseName loggedAt rideSource avgPowerWatts trainingStressScore rideXp courseId'
        )
        .lean(),
    ]);

    const result = dateStrings.map((dateStr) => {
      const dayStart = startOfDay(dateStr).getTime();
      const dayEnd = endOfDay(dateStr).getTime();

      const nutritionEntries = allNutrition.filter((e) => {
        if (!e.logDate) return false;
        const t = new Date(e.logDate).getTime();
        return t >= dayStart && t <= dayEnd;
      });

      const dayWorkouts = allWorkouts.filter((l) => {
        if (!l.loggedAt) return false;
        return toZonedDateString(new Date(l.loggedAt)) === dateStr;
      });

      const sessionLogs = dayWorkouts.filter(
        (l) => !(typeof l.exerciseName === 'string' && l.exerciseName.length > 0)
      );
      const setLogs = dayWorkouts.filter(
        (l) => typeof l.exerciseName === 'string' && l.exerciseName.length > 0
      );

      const toSession = (l: (typeof sessionLogs)[number]): SessionWorkout => {
        const distanceMeters =
          typeof l.distanceMeters === 'number' && Number.isFinite(l.distanceMeters)
            ? Number(l.distanceMeters)
            : null;
        const distanceMilesFromLog =
          typeof l.distanceMiles === 'number' && Number.isFinite(l.distanceMiles)
            ? Number(l.distanceMiles)
            : null;
        const distanceMiles =
          distanceMilesFromLog ??
          (distanceMeters != null && distanceMeters > 0
            ? Math.round((distanceMeters / 1609.344) * 100) / 100
            : null);
        const isRide =
          typeof l.rideSource === 'string' &&
          ['ftms', 'cps', 'mock'].includes(l.rideSource);

        return {
          planId: l.planId ?? null,
          dayNumber: l.dayNumber ?? null,
          caloriesBurned: l.isRestDay
            ? 0
            : l.caloriesBurned != null
              ? Number(l.caloriesBurned)
              : isRide
                ? 0
                : DEFAULT_CALORIES_BURNED,
          cardioExercise: l.cardioExercise ?? null,
          cardioDurationMinutes: l.cardioDurationMinutes ?? null,
          distanceMiles,
          distanceMeters,
          isRestDay: !!l.isRestDay,
          rideSource: isRide ? String(l.rideSource) : null,
          avgPowerWatts:
            typeof l.avgPowerWatts === 'number' ? Math.round(l.avgPowerWatts) : null,
          trainingStressScore:
            typeof l.trainingStressScore === 'number'
              ? Math.round(l.trainingStressScore)
              : null,
          rideXp: typeof l.rideXp === 'number' ? Math.round(l.rideXp) : null,
          courseId: typeof l.courseId === 'string' ? l.courseId : null,
        };
      };

      let workouts: SessionWorkout[] = sessionLogs.map(toSession);

      // Older flow: "Save loads" only — no Mark complete. Show one session per plan day.
      if (workouts.length === 0 && setLogs.length > 0) {
        const seen = new Set<string>();
        for (const l of setLogs) {
          const planId = l.planId ?? null;
          const dayNumber = typeof l.dayNumber === 'number' ? l.dayNumber : null;
          const key = `${planId ?? 'x'}:${dayNumber ?? 'x'}`;
          if (seen.has(key)) continue;
          seen.add(key);
          workouts.push({
            planId,
            dayNumber,
            caloriesBurned: DEFAULT_CALORIES_BURNED,
            cardioExercise: null,
            cardioDurationMinutes: null,
            distanceMiles: null,
            distanceMeters: null,
            isRestDay: false,
            rideSource: null,
            avgPowerWatts: null,
            trainingStressScore: null,
            rideXp: null,
            courseId: null,
          });
        }
      }

      const intake = nutritionEntries.reduce(
        (sum, e) => sum + (e.calories != null ? Number(e.calories) : 0),
        0
      );
      const totalBurn = workouts.reduce((sum, w) => sum + w.caloriesBurned, 0);
      // Food in − workout burn out. Empty stomach + ride → negative (deficit).
      const surplus = Math.round(intake - totalBurn);

      return {
        date: dateStr,
        intake,
        totalBurn,
        surplus,
        workouts,
      };
    });

    return NextResponse.json({ days: result });
  } catch (e) {
    console.error('Progress daily-summary error:', e);
    return NextResponse.json(
      { error: 'Failed to load daily summary' },
      { status: 500 }
    );
  }
}
