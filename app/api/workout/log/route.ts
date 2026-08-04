import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import WorkoutLog from '@/models/WorkoutLog';
import NutritionLog from '@/models/NutritionLog';
import User from '@/models/User';
import { getCardioOption } from '@/lib/cardio';
import { dateOnlyToUtcNoon, todayLocal } from '@/lib/local-date';
import { evaluateRestDayMacros, isFutureDateOnly } from '@/lib/rest-day-macros';

const DEFAULT_CALORIES_BURNED = 270;

function parseLogDate(raw: unknown): { ok: true; date: Date | null } | { ok: false; error: string } {
  if (raw == null || raw === '') return { ok: true, date: null };
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { ok: false, error: 'logDate must be YYYY-MM-DD' };
  }
  if (isFutureDateOnly(raw, todayLocal())) {
    return { ok: false, error: 'Cannot log a future date' };
  }
  const date = dateOnlyToUtcNoon(raw);
  if (!date) return { ok: false, error: 'Invalid logDate' };
  return { ok: true, date };
}

function nutritionDayBounds(dateStr: string): { start: Date; end: Date } {
  const start = new Date(dateStr);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

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
      .select(
        'planId dayNumber loggedAt caloriesBurned cardioExercise cardioDurationMinutes isRestDay'
      )
      .lean();
    return NextResponse.json({
      logs: logs.map((l) => ({
        id: String(l._id),
        planId: l.planId ?? null,
        dayNumber: l.dayNumber ?? null,
        loggedAt: l.loggedAt ? new Date(l.loggedAt).toISOString() : null,
        caloriesBurned: l.isRestDay
          ? 0
          : l.caloriesBurned != null
            ? l.caloriesBurned
            : DEFAULT_CALORIES_BURNED,
        cardioExercise: l.cardioExercise ?? null,
        cardioDurationMinutes: l.cardioDurationMinutes ?? null,
        isRestDay: !!l.isRestDay,
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
    const {
      planId,
      dayNumber,
      durationMinutes,
      caloriesBurned: bodyBurn,
      cardioExercise,
      cardioDurationMinutes,
      restDay,
      logDate: rawLogDate,
    } = body as {
      planId?: string;
      dayNumber?: number;
      durationMinutes?: number;
      caloriesBurned?: number;
      cardioExercise?: string;
      cardioDurationMinutes?: number;
      restDay?: boolean;
      logDate?: string;
    };

    const parsedDate = parseLogDate(rawLogDate);
    if (!parsedDate.ok) {
      return NextResponse.json({ error: parsedDate.error }, { status: 400 });
    }
    const loggedAtOverride = parsedDate.date;
    const dateKey =
      typeof rawLogDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawLogDate)
        ? rawLogDate
        : todayLocal();

    await connectDB();

    if (restDay === true) {
      const user = await User.findById(session.user.id)
        .select('calorieTarget proteinTarget')
        .lean();
      const { start, end } = nutritionDayBounds(dateKey);
      const nutritionEntries = await NutritionLog.find({
        userId: session.user.id,
        logDate: { $gte: start, $lte: end },
      })
        .select('calories proteinG')
        .lean();
      const calories = nutritionEntries.reduce(
        (sum, e) => sum + (e.calories != null ? Number(e.calories) : 0),
        0
      );
      const proteinG = nutritionEntries.reduce(
        (sum, e) => sum + (e.proteinG != null ? Number(e.proteinG) : 0),
        0
      );
      const status = evaluateRestDayMacros(
        { calories, proteinG },
        {
          calorieTarget: user?.calorieTarget ?? null,
          proteinTarget: user?.proteinTarget ?? null,
        }
      );
      if (!status.ready) {
        return NextResponse.json(
          {
            error: status.message,
            code: status.targetsSet ? 'REST_MACROS_NOT_MET' : 'REST_TARGETS_MISSING',
            status,
          },
          { status: 400 }
        );
      }

      const doc = await WorkoutLog.create({
        userId: session.user.id,
        isRestDay: true,
        caloriesBurned: 0,
        ...(loggedAtOverride ? { loggedAt: loggedAtOverride } : {}),
      });
      return NextResponse.json({
        id: String(doc._id),
        planId: null,
        dayNumber: null,
        loggedAt: doc.loggedAt ? new Date(doc.loggedAt).toISOString() : null,
        caloriesBurned: 0,
        cardioExercise: null,
        cardioDurationMinutes: null,
        isRestDay: true,
      });
    }

    const isCardio =
      typeof cardioExercise === 'string' &&
      cardioExercise.length > 0 &&
      typeof cardioDurationMinutes === 'number' &&
      cardioDurationMinutes > 0;

    if (isCardio) {
      const option = getCardioOption(cardioExercise);
      if (!option) {
        return NextResponse.json({ error: 'Invalid cardio exercise' }, { status: 400 });
      }
      const caloriesBurned = Math.round(cardioDurationMinutes * option.calPerMin);
      const doc = await WorkoutLog.create({
        userId: session.user.id,
        cardioExercise: option.id,
        cardioDurationMinutes,
        caloriesBurned,
        ...(loggedAtOverride ? { loggedAt: loggedAtOverride } : {}),
      });
      return NextResponse.json({
        id: String(doc._id),
        planId: null,
        dayNumber: null,
        loggedAt: doc.loggedAt ? new Date(doc.loggedAt).toISOString() : null,
        caloriesBurned: doc.caloriesBurned ?? caloriesBurned,
        cardioExercise: doc.cardioExercise ?? option.id,
        cardioDurationMinutes: doc.cardioDurationMinutes ?? cardioDurationMinutes,
        isRestDay: false,
      });
    }

    if (!planId || typeof planId !== 'string' || typeof dayNumber !== 'number' || dayNumber < 1) {
      return NextResponse.json(
        {
          error:
            'Missing planId or invalid dayNumber, or provide cardioExercise and cardioDurationMinutes, or restDay: true',
        },
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
    const doc = await WorkoutLog.create({
      userId: session.user.id,
      planId,
      dayNumber,
      caloriesBurned,
      ...(loggedAtOverride ? { loggedAt: loggedAtOverride } : {}),
    });
    return NextResponse.json({
      id: String(doc._id),
      planId: doc.planId,
      dayNumber: doc.dayNumber,
      loggedAt: doc.loggedAt ? new Date(doc.loggedAt).toISOString() : null,
      caloriesBurned: doc.caloriesBurned ?? DEFAULT_CALORIES_BURNED,
      cardioExercise: null,
      cardioDurationMinutes: null,
      isRestDay: false,
    });
  } catch (e) {
    console.error('Workout log POST error:', e);
    return NextResponse.json({ error: 'Failed to log workout' }, { status: 500 });
  }
}
