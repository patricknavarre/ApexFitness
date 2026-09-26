import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import WorkoutLog from '@/models/WorkoutLog';
import { getRideCourse } from '@/lib/ride/courses';
import { getRideWorkout } from '@/lib/ride/workouts';

const RIDE_CARDIO_ID = 'indoor-cycling';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    await connectDB();
    const log = (await WorkoutLog.findOne({
      _id: id,
      userId: session.user.id,
      cardioExercise: RIDE_CARDIO_ID,
      rideSource: { $in: ['ftms', 'cps', 'mock'] },
    }).lean()) as Record<string, unknown> | null;

    if (!log) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }

    const course = getRideCourse(
      typeof log.courseId === 'string' ? log.courseId : null
    );
    const workout = getRideWorkout(
      typeof log.workoutId === 'string' ? log.workoutId : null
    );
    const durationMinutes =
      typeof log.cardioDurationMinutes === 'number'
        ? log.cardioDurationMinutes
        : typeof log.durationMinutes === 'number'
          ? log.durationMinutes
          : null;
    const movingSeconds =
      durationMinutes != null ? Math.round(Number(durationMinutes) * 60) : null;

    const powerRaw = Array.isArray(log.powerSeries) ? log.powerSeries : [];
    const hrRaw = Array.isArray(log.hrSeries) ? log.hrSeries : [];
    const lapsRaw = Array.isArray(log.laps) ? log.laps : [];

    return NextResponse.json({
      id: String(log._id),
      loggedAt: log.loggedAt
        ? new Date(log.loggedAt as string | Date).toISOString()
        : null,
      durationMinutes,
      movingSeconds,
      pausedSeconds:
        typeof log.pausedSeconds === 'number' ? log.pausedSeconds : null,
      caloriesBurned:
        typeof log.caloriesBurned === 'number' ? log.caloriesBurned : null,
      avgPowerWatts:
        typeof log.avgPowerWatts === 'number' ? log.avgPowerWatts : null,
      maxPowerWatts:
        typeof log.maxPowerWatts === 'number' ? log.maxPowerWatts : null,
      normalizedPowerWatts:
        typeof log.normalizedPowerWatts === 'number'
          ? log.normalizedPowerWatts
          : null,
      intensityFactor:
        typeof log.intensityFactor === 'number' ? log.intensityFactor : null,
      trainingStressScore:
        typeof log.trainingStressScore === 'number'
          ? log.trainingStressScore
          : null,
      workKj: typeof log.workKj === 'number' ? log.workKj : null,
      avgCadenceRpm:
        typeof log.avgCadenceRpm === 'number' ? log.avgCadenceRpm : null,
      maxCadenceRpm:
        typeof log.maxCadenceRpm === 'number' ? log.maxCadenceRpm : null,
      distanceMeters:
        typeof log.distanceMeters === 'number' ? log.distanceMeters : null,
      energyKcal: typeof log.energyKcal === 'number' ? log.energyKcal : null,
      avgHeartRateBpm:
        typeof log.avgHeartRateBpm === 'number' ? log.avgHeartRateBpm : null,
      maxHeartRateBpm:
        typeof log.maxHeartRateBpm === 'number' ? log.maxHeartRateBpm : null,
      deviceName: typeof log.deviceName === 'string' ? log.deviceName : null,
      hrDeviceName:
        typeof log.hrDeviceName === 'string' ? log.hrDeviceName : null,
      rideSource: typeof log.rideSource === 'string' ? log.rideSource : null,
      ftpUsed: typeof log.ftpUsed === 'number' ? log.ftpUsed : null,
      maxHrUsed: typeof log.maxHrUsed === 'number' ? log.maxHrUsed : null,
      rideXp: typeof log.rideXp === 'number' ? log.rideXp : null,
      rideUsedErg: Boolean(log.rideUsedErg),
      courseId: typeof log.courseId === 'string' ? log.courseId : null,
      courseName: course?.name ?? null,
      courseCompleted: Boolean(log.courseCompleted),
      elevationGainMeters:
        typeof log.elevationGainMeters === 'number'
          ? log.elevationGainMeters
          : null,
      workoutId: typeof log.workoutId === 'string' ? log.workoutId : null,
      workoutName: workout?.name ?? null,
      workoutCompleted: Boolean(log.workoutCompleted),
      powerSeries: powerRaw.map((p) => {
        const pt = p as { t?: number; w?: number };
        return { t: Number(pt.t) || 0, w: Number(pt.w) || 0 };
      }),
      hrSeries: hrRaw.map((p) => {
        const pt = p as { t?: number; bpm?: number };
        return { t: Number(pt.t) || 0, bpm: Number(pt.bpm) || 0 };
      }),
      laps: lapsRaw.map((lap) => {
        const l = lap as {
          index?: number;
          elapsedSec?: number;
          durationSec?: number;
          distanceMeters?: number;
          avgPowerWatts?: number;
          avgHeartRateBpm?: number;
        };
        return {
          index: l.index ?? null,
          elapsedSec: l.elapsedSec ?? null,
          durationSec: l.durationSec ?? null,
          distanceMeters: l.distanceMeters ?? null,
          avgPowerWatts: l.avgPowerWatts ?? null,
          avgHeartRateBpm: l.avgHeartRateBpm ?? null,
        };
      }),
    });
  } catch (e) {
    console.error('Ride detail GET error:', e);
    return NextResponse.json({ error: 'Failed to load ride' }, { status: 500 });
  }
}
