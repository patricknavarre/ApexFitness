import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import WorkoutLog from '@/models/WorkoutLog';

const DEFAULT_CALORIES_BURNED = 270;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 30));
  try {
    await connectDB();
    const logs = await WorkoutLog.find({ userId: session.user.id })
      .sort({ loggedAt: -1 })
      .limit(limit)
      .select('planId dayNumber loggedAt caloriesBurned')
      .lean();
    return NextResponse.json({
      logs: logs.map((l) => ({
        id: String(l._id),
        planId: l.planId ?? null,
        dayNumber: l.dayNumber ?? null,
        loggedAt: l.loggedAt ? new Date(l.loggedAt).toISOString() : null,
        caloriesBurned: l.caloriesBurned != null ? l.caloriesBurned : DEFAULT_CALORIES_BURNED,
      })),
    });
  } catch (e) {
    console.error('Workout log GET error:', e);
    return NextResponse.json({ error: 'Failed to load logs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { planId, dayNumber, durationMinutes, caloriesBurned: bodyBurn } = body as {
      planId?: string;
      dayNumber?: number;
      durationMinutes?: number;
      caloriesBurned?: number;
    };
    if (!planId || typeof planId !== 'string' || typeof dayNumber !== 'number' || dayNumber < 1) {
      return NextResponse.json(
        { error: 'Missing planId or invalid dayNumber' },
        { status: 400 }
      );
    }
    let caloriesBurned: number | undefined;
    if (typeof bodyBurn === 'number' && bodyBurn >= 0) {
      caloriesBurned = bodyBurn;
    } else if (typeof durationMinutes === 'number' && durationMinutes > 0) {
      caloriesBurned = Math.round(durationMinutes * 6);
    } else {
      caloriesBurned = DEFAULT_CALORIES_BURNED;
    }
    await connectDB();
    const doc = await WorkoutLog.create({
      userId: session.user.id,
      planId,
      dayNumber,
      caloriesBurned,
    });
    return NextResponse.json({
      id: String(doc._id),
      planId: doc.planId,
      dayNumber: doc.dayNumber,
      loggedAt: doc.loggedAt ? new Date(doc.loggedAt).toISOString() : null,
      caloriesBurned: doc.caloriesBurned ?? DEFAULT_CALORIES_BURNED,
    });
  } catch (e) {
    console.error('Workout log POST error:', e);
    return NextResponse.json({ error: 'Failed to log workout' }, { status: 500 });
  }
}
