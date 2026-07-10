import { createHash } from 'crypto';
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
import { serializeDateOnly, todayLocal, toLocalDateOnly } from '@/lib/local-date';

export const runtime = 'nodejs';
export const maxDuration = 30;

const DEFAULT_CALORIES_BURNED = 270;
const REGEN_COOLDOWN_MS = 30 * 60 * 1000;

type InsightContext = {
  goal: string;
  todayWorkout: string;
  isRestDay: boolean;
  exercises: string[];
  workoutCompletedToday: boolean;
  nutritionReminders: string[];
  caloriesToday: number;
  calorieTarget: number | null;
  proteinToday: number;
  proteinTarget: number | null;
  carbsToday: number;
  carbTarget: number | null;
  fatToday: number;
  fatTarget: number | null;
  remainingCalories: number | null;
  remainingProtein: number | null;
  remainingCarbs: number | null;
  remainingFat: number | null;
  mealsLogged: string[];
  caloriesBurnedToday: number;
  workoutStreak: number;
  daysThisWeek: number;
  focusAreas: string[] | null;
  latestAnalysisSummary: string | null;
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

function hashContext(context: InsightContext): string {
  return createHash('sha256').update(JSON.stringify(context)).digest('hex').slice(0, 16);
}

function remaining(target: number | null, current: number): number | null {
  if (target == null) return null;
  return Math.max(0, Math.round(target - current));
}

function buildRulesInsight(context: InsightContext): string {
  const calPart =
    context.calorieTarget != null
      ? `${context.caloriesToday}/${context.calorieTarget} cal`
      : `${context.caloriesToday} cal logged`;
  const proteinPart =
    context.proteinTarget != null
      ? `${Math.round(context.proteinToday)}/${context.proteinTarget}g protein`
      : null;

  if (context.isRestDay) {
    const fuel = proteinPart
      ? `Hit ${proteinPart} and keep moving lightly — recovery still counts.`
      : `Stay on top of nutrition (${calPart}) and keep recovery light.`;
    return `Rest day on the plan. ${fuel}`;
  }

  if (context.workoutCompletedToday) {
    const fuel = proteinPart
      ? `Nice work finishing ${context.todayWorkout}. Refuel toward ${proteinPart}.`
      : `Nice work finishing ${context.todayWorkout}. Keep fueling — ${calPart} so far.`;
    return fuel;
  }

  const session = context.todayWorkout !== 'No active plan' ? context.todayWorkout : "today's session";
  if (proteinPart && context.remainingProtein != null && context.remainingProtein > 0) {
    return `${session} is on deck. You're at ${proteinPart} — leave room to hit the rest after training.`;
  }
  return `${session} is on deck. You're at ${calPart} so far — train hard and stay consistent.`;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const dateParam = url.searchParams.get('date');
  const today =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayLocal();

  try {
    await connectDB();
    const user = await User.findById(session.user.id)
      .select(
        'lastInsightDate lastInsightText lastInsightContextHash lastInsightGeneratedAt calorieTarget proteinTarget carbTarget fatTarget activePlanId planStartedAt activePlanDayNumber activePlanDaySetOn goal'
      )
      .lean();

    if (!user || Array.isArray(user)) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
    const totalCarbs = nutritionEntries.reduce((s, e) => s + (e.carbsG ?? 0), 0);
    const totalFat = nutritionEntries.reduce((s, e) => s + (e.fatG ?? 0), 0);
    const mealsLogged = Array.from(
      new Set(
        nutritionEntries
          .map((e) => e.meal)
          .filter((m): m is string => typeof m === 'string' && m.length > 0)
      )
    );

    const loggedDates = new Set<string>();
    let caloriesBurnedToday = 0;
    for (const log of workoutLogs) {
      if (!log.loggedAt) continue;
      const local = toLocalDateOnly(new Date(log.loggedAt));
      loggedDates.add(local);
      if (local === today) {
        caloriesBurnedToday +=
          log.caloriesBurned != null ? Number(log.caloriesBurned) : DEFAULT_CALORIES_BURNED;
      }
    }

    const plan = WORKOUT_PLANS.find((p) => p.id === user.activePlanId) ?? null;
    const planStartedAt = serializeDateOnly(user.planStartedAt as Date | undefined);
    const activePlanDaySetOn =
      typeof user.activePlanDaySetOn === 'string' ? user.activePlanDaySetOn : null;
    const activeDay =
      plan && planStartedAt
        ? getActivePlanDay(
            plan,
            planStartedAt,
            typeof user.activePlanDayNumber === 'number' ? user.activePlanDayNumber : null,
            activePlanDaySetOn,
            today
          )
        : null;

    const workoutCompletedToday = !!(
      activeDay &&
      workoutLogs.some(
        (log) =>
          log.loggedAt &&
          toLocalDateOnly(new Date(log.loggedAt)) === today &&
          log.planId === plan?.id &&
          log.dayNumber === activeDay.dayNumber
      )
    );

    const calorieTarget =
      typeof user.calorieTarget === 'number' ? user.calorieTarget : null;
    const proteinTarget =
      typeof user.proteinTarget === 'number' ? user.proteinTarget : null;
    const carbTarget = typeof user.carbTarget === 'number' ? user.carbTarget : null;
    const fatTarget = typeof user.fatTarget === 'number' ? user.fatTarget : null;

    const focusAreas =
      latestAnalysis &&
      !Array.isArray(latestAnalysis) &&
      Array.isArray(latestAnalysis.focusAreas)
        ? (latestAnalysis.focusAreas as string[]).slice(0, 3)
        : null;

    const context: InsightContext = {
      goal: (user.goal as string) ?? 'not set',
      todayWorkout: activeDay
        ? activeDay.day.isRest
          ? `Rest day (Day ${activeDay.dayNumber})`
          : `Day ${activeDay.dayNumber} — ${activeDay.day.title}`
        : 'No active plan',
      isRestDay: activeDay?.day.isRest ?? false,
      exercises: activeDay && !activeDay.day.isRest
        ? activeDay.day.exercises.map((e) => e.name).slice(0, 8)
        : [],
      workoutCompletedToday,
      nutritionReminders: plan?.nutritionReminders?.slice(0, 3) ?? [],
      caloriesToday: totalCal,
      calorieTarget,
      proteinToday: Math.round(totalProtein),
      proteinTarget,
      carbsToday: Math.round(totalCarbs),
      carbTarget,
      fatToday: Math.round(totalFat),
      fatTarget,
      remainingCalories: remaining(calorieTarget, totalCal),
      remainingProtein: remaining(proteinTarget, totalProtein),
      remainingCarbs: remaining(carbTarget, totalCarbs),
      remainingFat: remaining(fatTarget, totalFat),
      mealsLogged,
      caloriesBurnedToday: Math.round(caloriesBurnedToday),
      workoutStreak: computeWorkoutStreak(loggedDates, plan, planStartedAt),
      daysThisWeek: countDaysThisWeek(loggedDates),
      focusAreas,
      latestAnalysisSummary:
        latestAnalysis && !Array.isArray(latestAnalysis) && typeof latestAnalysis.summary === 'string'
          ? latestAnalysis.summary
          : null,
    };

    const contextHash = hashContext(context);
    const cachedDate =
      typeof user.lastInsightDate === 'string' ? user.lastInsightDate.slice(0, 10) : null;
    const cachedText =
      typeof user.lastInsightText === 'string' ? user.lastInsightText : null;
    const cachedHash =
      typeof user.lastInsightContextHash === 'string' ? user.lastInsightContextHash : null;
    const generatedAt = user.lastInsightGeneratedAt
      ? new Date(user.lastInsightGeneratedAt as Date).getTime()
      : 0;
    const withinCooldown =
      generatedAt > 0 && Date.now() - generatedAt < REGEN_COOLDOWN_MS;

    if (cachedDate === today && cachedText) {
      if (cachedHash === contextHash || withinCooldown) {
        return NextResponse.json({ insight: cachedText });
      }
    }

    let insight: string;
    if (!process.env.ANTHROPIC_API_KEY) {
      insight = buildRulesInsight(context);
    } else {
      const { text } = await generateText({
        model: anthropic(getAnthropicModelId()),
        system:
          'You are a concise, encouraging fitness coach. Write exactly 1-2 short sentences. Always mention today’s workout session (or that it is a rest/recovery day) by name when provided, and include one concrete nutrition or progress number from the data (calories, protein, remaining macros, streak, or burn). Be specific and motivating. No bullet points.',
        prompt: `User data today:\n${JSON.stringify(context, null, 2)}\n\nWrite today's insight.`,
        maxTokens: 140,
      });
      insight = text.trim() || buildRulesInsight(context);
    }

    await User.findByIdAndUpdate(session.user.id, {
      $set: {
        lastInsightDate: today,
        lastInsightText: insight,
        lastInsightContextHash: contextHash,
        lastInsightGeneratedAt: new Date(),
      },
    });

    return NextResponse.json({ insight });
  } catch (e) {
    console.error('Insight GET error:', e);
    return NextResponse.json({ insight: null });
  }
}
