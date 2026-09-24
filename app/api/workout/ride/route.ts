import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import WorkoutLog from '@/models/WorkoutLog';
import { getCardioOption } from '@/lib/cardio';
import { xpFromRide } from '@/lib/ride/xp';
import { getRideWorkout, workoutTotalSeconds } from '@/lib/ride/workouts';

const RIDE_CARDIO_ID = 'indoor-cycling';
/** Hard ceiling so sleep/tab-freeze bugs can't poison Momentum stats. */
const MAX_RIDE_SECONDS = 6 * 60 * 60;

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

    // Clamp absurd durations (e.g. laptop sleep left the wall clock running).
    let safeDurationSec = Math.min(Math.max(0, durationSeconds), MAX_RIDE_SECONDS);
    const workout =
      typeof workoutId === 'string' ? getRideWorkout(workoutId) : null;
    if (workout) {
      const planned = workoutTotalSeconds(workout);
      const softCap = planned + 10 * 60;
      if (safeDurationSec > softCap) {
        safeDurationSec = planned;
      }
    }

    const source =
      rideSource === 'ftms' || rideSource === 'cps' || rideSource === 'mock'
        ? rideSource
        : 'ftms';

    const option = getCardioOption(RIDE_CARDIO_ID)!;
    const durationMinutes = Math.max(1, Math.round(safeDurationSec / 60));
    const fromEnergy =
      typeof energyKcal === 'number' && energyKcal > 0 ? Math.round(energyKcal) : null;
    const fromPower =
      typeof avgPowerWatts === 'number' && avgPowerWatts > 0
        ? Math.round((avgPowerWatts * safeDurationSec) / 1000)
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

    // If duration was clamped, recompute TSS from NP so inflated client TSS doesn't stick.
    let safeTss =
      typeof trainingStressScore === 'number' ? trainingStressScore : null;
    let safeWork =
      typeof workKj === 'number' ? workKj : null;
    if (safeDurationSec < durationSeconds) {
      const np =
        typeof normalizedPowerWatts === 'number' ? normalizedPowerWatts : null;
      const ftp = typeof ftpUsed === 'number' && ftpUsed > 0 ? ftpUsed : 200;
      if (np != null && np > 0) {
        const iff = np / ftp;
        safeTss = ((safeDurationSec * np * iff) / (ftp * 3600)) * 100;
      } else {
        safeTss = null;
      }
      if (typeof avgPowerWatts === 'number' && avgPowerWatts > 0) {
        safeWork = (avgPowerWatts * safeDurationSec) / 1000;
      }
    }

    const rideXp = xpFromRide({
      durationSeconds: safeDurationSec,
      trainingStressScore: safeTss,
      workKj: safeWork,
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
        safeTss != null ? Math.round(safeTss) : undefined,
      workKj: safeWork != null ? Math.round(safeWork * 10) / 10 : undefined,
      avgCadenceRpm:
        numOrUndef(avgCadenceRpm) != null ? Math.round(avgCadenceRpm!) : undefined,
      maxCadenceRpm:
        numOrUndef(maxCadenceRpm) != null ? Math.round(maxCadenceRpm!) : undefined,
      distanceMeters:
        numOrUndef(distanceMeters) != null ? Math.round(distanceMeters!) : undefined,
      distanceMiles:
        numOrUndef(distanceMeters) != null && distanceMeters! > 0
          ? Math.round((distanceMeters! / 1609.344) * 1000) / 1000
          : undefined,
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
      durationClamped: safeDurationSec < durationSeconds,
    });
  } catch (e) {
    console.error('Ride POST error:', e);
    return NextResponse.json({ error: 'Failed to save ride' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  try {
    await connectDB();
    const result = await WorkoutLog.deleteOne({
      _id: id,
      userId: session.user.id,
      cardioExercise: RIDE_CARDIO_ID,
      rideSource: { $in: ['ftms', 'cps', 'mock'] },
    });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Ride DELETE error:', e);
    return NextResponse.json({ error: 'Failed to delete ride' }, { status: 500 });
  }
}
