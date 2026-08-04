import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import WorkoutLog from '@/models/WorkoutLog';

type SetInput = {
  setIndex: number;
  weight: number;
  reps: number;
};

type LeanSetLog = {
  _id: unknown;
  planId?: string | null;
  dayNumber?: number | null;
  exerciseName?: string | null;
  sets?: SetInput[];
  loggedAt?: Date | null;
};

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

function mapLog(l: LeanSetLog) {
  return {
    id: String(l._id),
    planId: l.planId ?? null,
    dayNumber: l.dayNumber ?? null,
    exerciseName: l.exerciseName ?? null,
    sets: (l.sets as SetInput[]) ?? [],
    loggedAt: l.loggedAt ? new Date(l.loggedAt).toISOString() : null,
  };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { planId, dayNumber, exerciseName, sets } = body as {
      planId?: string;
      dayNumber?: number;
      exerciseName?: string;
      sets?: SetInput[];
    };

    if (!planId || typeof planId !== 'string') {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
    }
    if (typeof dayNumber !== 'number' || dayNumber < 1) {
      return NextResponse.json({ error: 'Invalid dayNumber' }, { status: 400 });
    }
    if (!exerciseName || typeof exerciseName !== 'string') {
      return NextResponse.json({ error: 'Missing exerciseName' }, { status: 400 });
    }
    const cleanedSets = Array.isArray(sets)
      ? sets
          .map((s, idx) => ({
            setIndex: s.setIndex ?? idx + 1,
            weight: Number(s.weight) || 0,
            reps: Number(s.reps) || 0,
          }))
          .filter((s) => s.reps > 0 && s.weight >= 0)
      : [];

    if (cleanedSets.length === 0) {
      return NextResponse.json(
        { error: 'At least one set with reps is required' },
        { status: 400 }
      );
    }

    await connectDB();
    const doc = await WorkoutLog.create({
      userId: session.user.id,
      planId,
      dayNumber,
      exerciseName,
      sets: cleanedSets,
    });

    return NextResponse.json({
      id: String(doc._id),
      planId: doc.planId ?? null,
      dayNumber: doc.dayNumber ?? null,
      exerciseName: doc.exerciseName ?? exerciseName,
      sets: (doc.sets as SetInput[]) ?? cleanedSets,
      loggedAt: doc.loggedAt ? new Date(doc.loggedAt).toISOString() : null,
    });
  } catch (e) {
    console.error('Workout sets POST error:', e);
    return NextResponse.json({ error: 'Failed to log sets' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const latest = searchParams.get('latest');
  const exerciseName = searchParams.get('exerciseName');
  const dateStr = searchParams.get('date');
  const planId = searchParams.get('planId');
  const dayNumberRaw = searchParams.get('dayNumber');

  try {
    await connectDB();

    // Lifetime heaviest set per exercise (max weight; higher reps wins ties)
    if (searchParams.get('maxes') === '1') {
      const logs = (await WorkoutLog.find({
        userId: session.user.id,
        exerciseName: { $exists: true, $ne: null },
        sets: { $exists: true, $ne: [] },
      })
        .select('exerciseName sets loggedAt')
        .lean()) as LeanSetLog[];

      type MaxRow = {
        exerciseName: string;
        weight: number;
        reps: number;
        loggedAt: string | null;
      };
      const byExercise = new Map<string, MaxRow>();

      for (const log of logs) {
        const name = log.exerciseName?.trim();
        if (!name || !log.sets?.length) continue;
        for (const set of log.sets) {
          const weight = Number(set.weight) || 0;
          const reps = Number(set.reps) || 0;
          if (reps <= 0) continue;
          const loggedAt = log.loggedAt ? new Date(log.loggedAt).toISOString() : null;
          const prev = byExercise.get(name);
          if (
            !prev ||
            weight > prev.weight ||
            (weight === prev.weight && reps > prev.reps) ||
            (weight === prev.weight &&
              reps === prev.reps &&
              (loggedAt ?? '') > (prev.loggedAt ?? ''))
          ) {
            byExercise.set(name, { exerciseName: name, weight, reps, loggedAt });
          }
        }
      }

      const maxes = Array.from(byExercise.values()).sort((a, b) =>
        a.exerciseName.localeCompare(b.exerciseName)
      );
      return NextResponse.json({ maxes });
    }

    // Latest log for one exercise (prefills) — no date required
    if (latest === '1' && exerciseName) {
      const query: Record<string, unknown> = {
        userId: session.user.id,
        exerciseName,
        sets: { $exists: true, $ne: [] },
      };
      if (planId) query.planId = planId;
      const log = (await WorkoutLog.findOne(query)
        .sort({ loggedAt: -1 })
        .select('planId dayNumber exerciseName sets loggedAt')
        .lean()) as LeanSetLog | null;
      return NextResponse.json({ log: log ? mapLog(log) : null });
    }

    // Bulk latest: most recent set-log per exerciseName (optional planId / dayNumber)
    if (latest === '1' && !exerciseName) {
      const query: Record<string, unknown> = {
        userId: session.user.id,
        exerciseName: { $exists: true, $ne: null },
        sets: { $exists: true, $ne: [] },
      };
      if (planId) query.planId = planId;
      if (dayNumberRaw != null && dayNumberRaw !== '') {
        const dayNumber = Number(dayNumberRaw);
        if (Number.isNaN(dayNumber)) {
          return NextResponse.json({ error: 'Invalid dayNumber' }, { status: 400 });
        }
        query.dayNumber = dayNumber;
      }
      const logs = (await WorkoutLog.find(query)
        .sort({ loggedAt: -1 })
        .select('planId dayNumber exerciseName sets loggedAt')
        .lean()) as LeanSetLog[];

      const byExercise = new Map<string, ReturnType<typeof mapLog>>();
      for (const l of logs) {
        const name = l.exerciseName ?? null;
        if (!name || byExercise.has(name)) continue;
        byExercise.set(name, mapLog(l));
      }
      return NextResponse.json({ logs: Array.from(byExercise.values()) });
    }

    if (!dateStr) {
      return NextResponse.json(
        { error: 'Missing date (YYYY-MM-DD) or use latest=1' },
        { status: 400 }
      );
    }

    const dayNumber =
      dayNumberRaw != null && dayNumberRaw !== '' ? Number(dayNumberRaw) : undefined;

    const start = startOfDay(dateStr);
    const end = endOfDay(dateStr);
    const query: Record<string, unknown> = {
      userId: session.user.id,
      loggedAt: { $gte: start, $lte: end },
    };
    if (planId) query.planId = planId;
    if (typeof dayNumber === 'number' && !Number.isNaN(dayNumber)) {
      query.dayNumber = dayNumber;
    }

    const logs = (await WorkoutLog.find(query)
      .sort({ loggedAt: -1 })
      .select('planId dayNumber exerciseName sets loggedAt')
      .lean()) as LeanSetLog[];

    return NextResponse.json({
      logs: logs.map((l) => mapLog(l)),
    });
  } catch (e) {
    console.error('Workout sets GET error:', e);
    return NextResponse.json({ error: 'Failed to load sets' }, { status: 500 });
  }
}
