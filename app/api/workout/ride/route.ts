import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import WorkoutLog from '@/models/WorkoutLog';
import { getCardioOption } from '@/lib/cardio';

const RIDE_CARDIO_ID = 'indoor-cycling';

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
        'loggedAt cardioDurationMinutes caloriesBurned avgPowerWatts maxPowerWatts avgCadenceRpm distanceMeters energyKcal deviceName rideSource'
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
        avgCadenceRpm: l.avgCadenceRpm ?? null,
        distanceMeters: l.distanceMeters ?? null,
        energyKcal: l.energyKcal ?? null,
        deviceName: l.deviceName ?? null,
        rideSource: l.rideSource ?? null,
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
      avgCadenceRpm,
      distanceMeters,
      energyKcal,
      deviceName,
      rideSource,
    } = body as {
      durationSeconds?: number;
      avgPowerWatts?: number;
      maxPowerWatts?: number;
      avgCadenceRpm?: number;
      distanceMeters?: number;
      energyKcal?: number;
      deviceName?: string;
      rideSource?: string;
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

    await connectDB();
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
      avgPowerWatts:
        typeof avgPowerWatts === 'number' ? Math.round(avgPowerWatts) : undefined,
      maxPowerWatts:
        typeof maxPowerWatts === 'number' ? Math.round(maxPowerWatts) : undefined,
      avgCadenceRpm:
        typeof avgCadenceRpm === 'number' ? Math.round(avgCadenceRpm) : undefined,
      distanceMeters:
        typeof distanceMeters === 'number' ? Math.round(distanceMeters) : undefined,
      energyKcal: fromEnergy ?? undefined,
    });

    return NextResponse.json({
      id: String(doc._id),
      loggedAt: doc.loggedAt ? new Date(doc.loggedAt).toISOString() : null,
      durationMinutes: doc.cardioDurationMinutes,
      caloriesBurned: doc.caloriesBurned,
      avgPowerWatts: doc.avgPowerWatts ?? null,
      maxPowerWatts: doc.maxPowerWatts ?? null,
      avgCadenceRpm: doc.avgCadenceRpm ?? null,
      distanceMeters: doc.distanceMeters ?? null,
      deviceName: doc.deviceName ?? null,
      rideSource: doc.rideSource ?? null,
    });
  } catch (e) {
    console.error('Ride POST error:', e);
    return NextResponse.json({ error: 'Failed to save ride' }, { status: 500 });
  }
}
