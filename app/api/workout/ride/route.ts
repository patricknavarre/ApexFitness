import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import WorkoutLog from '@/models/WorkoutLog';
import { getCardioOption } from '@/lib/cardio';
import { xpFromRide } from '@/lib/ride/xp';

const RIDE_CARDIO_ID = 'indoor-cycling';

type LapBody = {
  index?: number;
  elapsedSec?: number;
  durationSec?: number;
  distanceMeters?: number;
  avgPowerWatts?: number;
  avgHeartRateBpm?: number;
};

function numOrUndef(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 10));
  try {
    await connectDB();
    const logs = await WorkoutLog.find({
      userId: session.user.id,
      cardioExercise: RIDE_CARDIO_ID,
      rideSource: { $in: ['ftms', 'cps', 'mock'] },
    })
      .sort({ loggedAt: -1 })
      .limit(limit)
      .select(
        'loggedAt cardioDurationMinutes caloriesBurned avgPowerWatts maxPowerWatts normalizedPowerWatts trainingStressScore workKj avgCadenceRpm maxCadenceRpm distanceMeters energyKcal avgHeartRateBpm maxHeartRateBpm deviceName hrDeviceName rideSource laps rideXp rideUsedErg courseId courseCompleted elevationGainMeters workoutId workoutCompleted'
      )
      .lean();
    return NextResponse.json({
      rides: logs.map((l) => ({
        id: String(l._id),
        loggedAt: l.loggedAt ? new Date(l.loggedAt).toISOString() : null,
        durationMinutes: l.cardioDurationMinutes ?? null,
        caloriesBurned: l.caloriesBurned ?? null,
        avgPowerWatts: l.avgPowerWatts ?? null,
        maxPowerWatts: l.maxPowerWatts ?? null,
        normalizedPowerWatts: l.normalizedPowerWatts ?? null,
        trainingStressScore: l.trainingStressScore ?? null,
        workKj: l.workKj ?? null,
        avgCadenceRpm: l.avgCadenceRpm ?? null,
        maxCadenceRpm: l.maxCadenceRpm ?? null,
        distanceMeters: l.distanceMeters ?? null,
        energyKcal: l.energyKcal ?? null,
        avgHeartRateBpm: l.avgHeartRateBpm ?? null,
        maxHeartRateBpm: l.maxHeartRateBpm ?? null,
        deviceName: l.deviceName ?? null,
        hrDeviceName: l.hrDeviceName ?? null,
        rideSource: l.rideSource ?? null,
        lapCount: Array.isArray(l.laps) ? l.laps.length : 0,
        rideXp: l.rideXp ?? null,
        rideUsedErg: Boolean(l.rideUsedErg),
        courseId: l.courseId ?? null,
        courseCompleted: Boolean(l.courseCompleted),
        elevationGainMeters: l.elevationGainMeters ?? null,
        workoutId: l.workoutId ?? null,
        workoutCompleted: Boolean(l.workoutCompleted),
      })),
    });
  } catch (e) {
    console.error('Ride GET error:', e);
    return NextResponse.json({ error: 'Failed to load rides' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const {
      durationSeconds,
      avgPowerWatts,
      maxPowerWatts,
      normalizedPowerWatts,
      intensityFactor,
      trainingStressScore,
      workKj,
      avgCadenceRpm,
      maxCadenceRpm,
      distanceMeters,
      energyKcal,
      avgHeartRateBpm,
      maxHeartRateBpm,
      deviceName,
      hrDeviceName,
      rideSource,
      ftpUsed,
      maxHrUsed,
      laps,
      rideUsedErg,
      courseId,
      courseCompleted,
      elevationGainMeters,
      workoutId,
      workoutCompleted,
    } = body as {
      durationSeconds?: number;
      avgPowerWatts?: number;
      maxPowerWatts?: number;
      normalizedPowerWatts?: number;
      intensityFactor?: number;
      trainingStressScore?: number;
      workKj?: number;
      avgCadenceRpm?: number;
      maxCadenceRpm?: number;
      distanceMeters?: number;
      energyKcal?: number;
      avgHeartRateBpm?: number;
      maxHeartRateBpm?: number;
      deviceName?: string;
      hrDeviceName?: string;
      rideSource?: string;
      ftpUsed?: number;
      maxHrUsed?: number;
      laps?: LapBody[];
      rideUsedErg?: boolean;
      courseId?: string;
      courseCompleted?: boolean;
      elevationGainMeters?: number;
      workoutId?: string;
      workoutCompleted?: boolean;
    };

    if (typeof durationSeconds !== 'number' || durationSeconds < 15) {
      return NextResponse.json(
        { error: 'Ride must be at least 15 seconds' },
        { status: 400 }
      );
    }

    const source =
      rideSource === 'ftms' || rideSource === 'cps' || rideSource === 'mock'
        ? rideSource
        : 'ftms';

    const option = getCardioOption(RIDE_CARDIO_ID)!;
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
    const fromEnergy =
      typeof energyKcal === 'number' && energyKcal > 0 ? Math.round(energyKcal) : null;
    const fromPower =
      typeof avgPowerWatts === 'number' && avgPowerWatts > 0
        ? Math.round((avgPowerWatts * durationSeconds) / 1000)
        : null;
    const caloriesBurned =
      fromEnergy ?? fromPower ?? Math.round(durationMinutes * option.calPerMin);

    const lapDocs = Array.isArray(laps)
      ? laps
          .slice(0, 100)
          .map((lap, i) => ({
            index: typeof lap.index === 'number' ? lap.index : i + 1,
            elapsedSec: numOrUndef(lap.elapsedSec),
            durationSec: numOrUndef(lap.durationSec),
            distanceMeters: numOrUndef(lap.distanceMeters),
            avgPowerWatts: numOrUndef(lap.avgPowerWatts),
            avgHeartRateBpm: numOrUndef(lap.avgHeartRateBpm),
          }))
      : [];

    await connectDB();
    const priorCount = await WorkoutLog.countDocuments({
      userId: session.user.id,
      cardioExercise: RIDE_CARDIO_ID,
      rideSource: { $in: ['ftms', 'cps', 'mock'] },
    });
    const usedErg = Boolean(rideUsedErg);
    const finishedCourse = Boolean(courseCompleted);
    const finishedWorkout = Boolean(workoutCompleted);
    const rideXp = xpFromRide({
      durationSeconds,
      trainingStressScore:
        typeof trainingStressScore === 'number' ? trainingStressScore : null,
      workKj: typeof workKj === 'number' ? workKj : null,
      avgHeartRateBpm:
        typeof avgHeartRateBpm === 'number' ? avgHeartRateBpm : null,
      usedErg,
      isFirstRideEver: priorCount === 0,
      completedCourse: finishedCourse,
      completedWorkout: finishedWorkout,
    });

    const doc = await WorkoutLog.create({
      userId: session.user.id,
      cardioExercise: RIDE_CARDIO_ID,
      cardioDurationMinutes: durationMinutes,
      durationMinutes,
      caloriesBurned,
      rideSource: source,
      deviceName:
        typeof deviceName === 'string' && deviceName.trim()
          ? deviceName.trim().slice(0, 80)
          : undefined,
      hrDeviceName:
        typeof hrDeviceName === 'string' && hrDeviceName.trim()
          ? hrDeviceName.trim().slice(0, 80)
          : undefined,
      avgPowerWatts: numOrUndef(avgPowerWatts) != null ? Math.round(avgPowerWatts!) : undefined,
      maxPowerWatts: numOrUndef(maxPowerWatts) != null ? Math.round(maxPowerWatts!) : undefined,
      normalizedPowerWatts:
        numOrUndef(normalizedPowerWatts) != null
          ? Math.round(normalizedPowerWatts!)
          : undefined,
      intensityFactor:
        numOrUndef(intensityFactor) != null
          ? Math.round(intensityFactor! * 100) / 100
          : undefined,
      trainingStressScore:
        numOrUndef(trainingStressScore) != null
          ? Math.round(trainingStressScore!)
          : undefined,
      workKj: numOrUndef(workKj) != null ? Math.round(workKj! * 10) / 10 : undefined,
      avgCadenceRpm:
        numOrUndef(avgCadenceRpm) != null ? Math.round(avgCadenceRpm!) : undefined,
      maxCadenceRpm:
        numOrUndef(maxCadenceRpm) != null ? Math.round(maxCadenceRpm!) : undefined,
      distanceMeters:
        numOrUndef(distanceMeters) != null ? Math.round(distanceMeters!) : undefined,
      energyKcal: fromEnergy ?? undefined,
      avgHeartRateBpm:
        numOrUndef(avgHeartRateBpm) != null ? Math.round(avgHeartRateBpm!) : undefined,
      maxHeartRateBpm:
        numOrUndef(maxHeartRateBpm) != null ? Math.round(maxHeartRateBpm!) : undefined,
      ftpUsed: numOrUndef(ftpUsed) != null ? Math.round(ftpUsed!) : undefined,
      maxHrUsed: numOrUndef(maxHrUsed) != null ? Math.round(maxHrUsed!) : undefined,
      rideXp,
      rideUsedErg: usedErg,
      courseId:
        typeof courseId === 'string' && courseId.trim()
          ? courseId.trim().slice(0, 64)
          : undefined,
      courseCompleted: finishedCourse,
      elevationGainMeters:
        numOrUndef(elevationGainMeters) != null
          ? Math.round(elevationGainMeters!)
          : undefined,
      workoutId:
        typeof workoutId === 'string' && workoutId.trim()
          ? workoutId.trim().slice(0, 64)
          : undefined,
      workoutCompleted: finishedWorkout,
      laps: lapDocs,
    });

    const xpAgg = await WorkoutLog.aggregate([
      {
        $match: {
          userId: doc.userId,
          cardioExercise: RIDE_CARDIO_ID,
          rideSource: { $in: ['ftms', 'cps', 'mock'] },
        },
      },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$rideXp', 0] } } } },
    ]);
    const totalRideXp = Number(xpAgg[0]?.total ?? rideXp);

    return NextResponse.json({
      id: String(doc._id),
      loggedAt: doc.loggedAt ? new Date(doc.loggedAt).toISOString() : null,
      durationMinutes: doc.cardioDurationMinutes,
      caloriesBurned: doc.caloriesBurned,
      avgPowerWatts: doc.avgPowerWatts ?? null,
      maxPowerWatts: doc.maxPowerWatts ?? null,
      normalizedPowerWatts: doc.normalizedPowerWatts ?? null,
      trainingStressScore: doc.trainingStressScore ?? null,
      workKj: doc.workKj ?? null,
      avgCadenceRpm: doc.avgCadenceRpm ?? null,
      maxCadenceRpm: doc.maxCadenceRpm ?? null,
      distanceMeters: doc.distanceMeters ?? null,
      avgHeartRateBpm: doc.avgHeartRateBpm ?? null,
      maxHeartRateBpm: doc.maxHeartRateBpm ?? null,
      deviceName: doc.deviceName ?? null,
      hrDeviceName: doc.hrDeviceName ?? null,
      rideSource: doc.rideSource ?? null,
      lapCount: lapDocs.length,
      rideXp,
      totalRideXp,
      rideUsedErg: usedErg,
      courseId: doc.courseId ?? null,
      courseCompleted: Boolean(doc.courseCompleted),
      workoutId: doc.workoutId ?? null,
      workoutCompleted: Boolean(doc.workoutCompleted),
    });
  } catch (e) {
    console.error('Ride POST error:', e);
    return NextResponse.json({ error: 'Failed to save ride' }, { status: 500 });
  }
}
