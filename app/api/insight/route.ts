import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import NutritionLog from '@/models/NutritionLog';
import WorkoutLog from '@/models/WorkoutLog';
import Analysis from '@/models/Analysis';
import { getAnthropicModelId } from '@/lib/anthropic-model';
import { WORKOUT_PLANS, getActivePlanDay } from '@/lib/workout-plans';
import { computeWorkoutStreak, countDaysThisWeek } from '@/lib/streak';

export const runtime = 'nodejs';
export const maxDuration = 30;

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toLocalDateOnly(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = todayLocal();

  try {
    await connectDB();
    const user = await User.findById(session.user.id)
      .select(
        'lastInsightDate lastInsightText calorieTarget proteinTarget activePlanId planStartedAt activePlanDayNumber goal'
      )
      .lean();

    if (!user || Array.isArray(user)) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const cachedDate = user.lastInsightDate
      ? new Date(user.lastInsightDate as Date).toISOString().slice(0, 10)
      : null;
    if (cachedDate === today && user.lastInsightText) {
      return NextResponse.json({ insight: user.lastInsightText });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ insight: null });
    }

    const start = startOfDay(today);
    const end = endOfDay(today);

    const [nutritionEntries, workoutLogs, latestAnalysis] = await Promise.all([
      NutritionLog.find({ userId: session.user.id, logDate: { $gte: start, $lte: end } }).lean(),
      WorkoutLog.find({ userId: session.user.id })
        .sort({ loggedAt: -1 })
        .limit(30)
        .lean(),
      Analysis.findOne({ userId: session.user.id }).sort({ createdAt: -1 }).lean(),
    ]);

    const totalCal = nutritionEntries.reduce((s, e) => s + (e.calories ?? 0), 0);
    const totalProtein = nutritionEntries.reduce((s, e) => s + (e.proteinG ?? 0), 0);
    const loggedDates = new Set<string>();
    for (const log of workoutLogs) {
      if (log.loggedAt) loggedDates.add(toLocalDateOnly(new Date(log.loggedAt).toISOString()));
    }

    const plan = WORKOUT_PLANS.find((p) => p.id === user.activePlanId) ?? null;
    const planStartedAt = user.planStartedAt
      ? new Date(user.planStartedAt as Date).toISOString().slice(0, 10)
      : null;
    const activeDay =
      plan && planStartedAt
        ? getActivePlanDay(
            plan,
            planStartedAt,
            typeof user.activePlanDayNumber === 'number' ? user.activePlanDayNumber : null
          )
        : null;

    const streak = computeWorkoutStreak(loggedDates, plan, planStartedAt);
    const daysThisWeek = countDaysThisWeek(loggedDates);

    const context = {
      goal: user.goal ?? 'not set',
      todayWorkout: activeDay
        ? activeDay.day.isRest
          ? 'Rest day'
          : `Day ${activeDay.dayNumber} — ${activeDay.day.title}`
        : 'No active plan',
      caloriesToday: totalCal,
      calorieTarget: user.calorieTarget ?? null,
      proteinToday: totalProtein,
      proteinTarget: user.proteinTarget ?? null,
      workoutStreak: streak,
      daysThisWeek,
      latestAnalysisSummary:
        latestAnalysis && !Array.isArray(latestAnalysis) && typeof latestAnalysis.summary === 'string'
          ? latestAnalysis.summary
          : null,
    };

    const { text } = await generateText({
      model: anthropic(getAnthropicModelId()),
      system:
        'You are a concise, encouraging fitness coach. Write exactly 1-2 short sentences based on the user data. Be specific and motivating. No bullet points.',
      prompt: `User data today:\n${JSON.stringify(context, null, 2)}\n\nWrite today's insight.`,
      maxTokens: 120,
    });

    const insight = text.trim();
    await User.findByIdAndUpdate(session.user.id, {
      $set: { lastInsightDate: today, lastInsightText: insight },
    });

    return NextResponse.json({ insight });
  } catch (e) {
    console.error('Insight GET error:', e);
    return NextResponse.json({ insight: null });
  }
}
