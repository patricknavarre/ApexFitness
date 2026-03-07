import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import NutritionLog from '@/models/NutritionLog';
import WorkoutLog from '@/models/WorkoutLog';

const DEFAULT_CALORIES_BURNED = 270;

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

function toDateString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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

    const now = new Date();
    const dateStrings: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      dateStrings.push(toDateString(d));
    }

    const result = await Promise.all(
      dateStrings.map(async (dateStr) => {
        const start = startOfDay(dateStr);
        const end = endOfDay(dateStr);

        const [nutritionEntries, workoutLogs] = await Promise.all([
          NutritionLog.find({
            userId,
            logDate: { $gte: start, $lte: end },
          })
            .select('calories')
            .lean(),
          WorkoutLog.find({
            userId,
            loggedAt: { $gte: start, $lte: end },
          })
            .select('planId dayNumber caloriesBurned')
            .lean(),
        ]);

        const intake = nutritionEntries.reduce(
          (sum, e) => sum + (e.calories != null ? Number(e.calories) : 0),
          0
        );
        const workouts = workoutLogs.map((l) => ({
          planId: l.planId ?? null,
          dayNumber: l.dayNumber ?? null,
          caloriesBurned: l.caloriesBurned != null ? Number(l.caloriesBurned) : DEFAULT_CALORIES_BURNED,
        }));
        const totalBurn = workouts.reduce((sum, w) => sum + w.caloriesBurned, 0);
        const surplus = intake - totalBurn;

        return {
          date: dateStr,
          intake,
          totalBurn,
          surplus,
          workouts,
        };
      })
    );

    return NextResponse.json({ days: result });
  } catch (e) {
    console.error('Progress daily-summary error:', e);
    return NextResponse.json(
      { error: 'Failed to load daily summary' },
      { status: 500 }
    );
  }
}
