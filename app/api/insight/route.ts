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
import { WORKOUT_PLANS, getActivePlanDay, getPlanDayByNumber, getTodaysDay } from '@/lib/workout-plans';
import { computeWorkoutStreak, countDaysThisWeek } from '@/lib/streak';
import {
  addLocalCalendarDays,
  serializeDateOnly,
  todayLocal,
  toLocalDateOnly,
} from '@/lib/local-date';

export const runtime = 'nodejs';
export const maxDuration = 30;

const DEFAULT_CALORIES_BURNED = 270;
const ALL_MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;

type InsightPayload = {
  headline: string;
  body: string;
};

type InsightContext = {
  goal: string;
  todayWorkout: string;
  isRestDay: boolean;
  workoutStatus: 'completed' | 'pending' | 'rest';
  exercises: string[];
  workoutCompletedToday: boolean;
  nextCalendarWorkout: string | null;
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
  macroPct: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  };
  mealsLogged: string[];
  mealsMissing: string[];
  caloriesBurnedToday: number;
  workoutStreak: number;
  daysThisWeek: number;
  timeOfDayBucket: 'morning' | 'afternoon' | 'evening';
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

function pctOfTarget(target: number | null, current: number): number | null {
  if (target == null || target <= 0) return null;
  return Math.round((current / target) * 100);
}

function timeOfDayBucket(dateYmd: string): 'morning' | 'afternoon' | 'evening' {
  const now = new Date();
  const localToday = todayLocal(now);
  // If the request is for "today", use current hour; otherwise default afternoon.
  const hour = dateYmd === localToday ? now.getHours() : 14;
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function serializeInsight(payload: InsightPayload): string {
  return JSON.stringify(payload);
}

function parseInsightText(raw: string | null | undefined): InsightPayload | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { headline?: unknown; body?: unknown };
      if (typeof parsed.headline === 'string' && typeof parsed.body === 'string') {
        return { headline: parsed.headline.trim(), body: parsed.body.trim() };
      }
    } catch {
      // fall through to legacy plain string
    }
  }
  return { headline: "Today's focus", body: trimmed };
}

function buildRulesInsight(context: InsightContext): InsightPayload {
  const calPart =
    context.calorieTarget != null
      ? `${context.caloriesToday}/${context.calorieTarget} cal (${context.macroPct.calories ?? 0}%)`
      : `${context.caloriesToday} cal logged`;
  const proteinPart =
    context.proteinTarget != null
      ? `${context.proteinToday}/${context.proteinTarget}g protein (${context.macroPct.protein ?? 0}%)`
      : null;
  const missing =
    context.mealsMissing.length > 0
      ? `Still open: ${context.mealsMissing.slice(0, 2).join(', ')}.`
      : 'Meals look covered for now.';
  const forward = context.nextCalendarWorkout
    ? `Tomorrow: ${context.nextCalendarWorkout}.`
    : 'Keep the streak going tomorrow.';

  if (context.workoutStatus === 'rest') {
    return {
      headline: 'Recovery day',
      body: [
        'Rest is on the plan — treat it as training for tomorrow.',
        proteinPart
          ? `Nutrition checkpoint: ${proteinPart}. ${missing}`
          : `Nutrition checkpoint: ${calPart}. ${missing}`,
        forward,
      ].join(' '),
    };
  }

  if (context.workoutStatus === 'completed') {
    const focus = context.exercises[0] ? ` Nice work locking in work like ${context.exercises[0]}.` : '';
    return {
      headline: `${context.todayWorkout} — done`,
      body: [
        `Session logged for ${context.todayWorkout}.${focus}`,
        proteinPart
          ? `Refuel toward ${proteinPart}. ${missing}`
          : `Keep fueling — ${calPart} so far. ${missing}`,
        forward,
      ].join(' '),
    };
  }

  const session =
    context.todayWorkout !== 'No active plan' ? context.todayWorkout : "today's session";
  const liftHint = context.exercises[0]
    ? ` Lead with ${context.exercises[0]}${context.exercises.length > 1 ? ' and follow the full list' : ''}.`
    : '';
  return {
    headline: `${session} ready`,
    body: [
      `${session} is still open.${liftHint}`,
      proteinPart && context.remainingProtein != null && context.remainingProtein > 0
        ? `You're at ${proteinPart} — leave room to finish protein after training. ${missing}`
        : `Fuel check: ${calPart}. ${missing}`,
      forward,
    ].join(' '),
  };
}

function extractJsonObject(text: string): InsightPayload | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as {
      headline?: unknown;
      body?: unknown;
    };
    if (typeof parsed.headline === 'string' && typeof parsed.body === 'string') {
      return { headline: parsed.headline.trim(), body: parsed.body.trim() };
    }
  } catch {
    return null;
  }
  return null;
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
    const mealsMissing = ALL_MEALS.filter((m) => !mealsLogged.includes(m));

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
    const scheduledDay =
      plan && planStartedAt
        ? getActivePlanDay(
            plan,
            planStartedAt,
            typeof user.activePlanDayNumber === 'number' ? user.activePlanDayNumber : null,
            activePlanDaySetOn,
            today
          )
        : null;

    // Prefer the day actually trained today over a stale "next day" override.
    const todaysPlanLog = plan
      ? workoutLogs.find(
          (log) =>
            log.loggedAt &&
            toLocalDateOnly(new Date(log.loggedAt)) === today &&
            log.planId === plan.id &&
            typeof log.dayNumber === 'number'
        )
      : null;
    const loggedDay =
      plan && todaysPlanLog && typeof todaysPlanLog.dayNumber === 'number'
        ? getPlanDayByNumber(plan, todaysPlanLog.dayNumber)
        : null;

    const activeDay =
      loggedDay && !loggedDay.day.isRest
        ? { ...loggedDay, isManual: false as const }
        : scheduledDay;

    // Heal stale jump-ahead override so subsequent reads agree.
    if (
      loggedDay &&
      !loggedDay.day.isRest &&
      activePlanDaySetOn === today &&
      typeof user.activePlanDayNumber === 'number' &&
      user.activePlanDayNumber !== loggedDay.dayNumber
    ) {
      await User.findByIdAndUpdate(session.user.id, {
        $set: {
          activePlanDayNumber: loggedDay.dayNumber,
          activePlanDaySetOn: today,
        },
      });
    }

    const tomorrowYmd = addLocalCalendarDays(today, 1);
    const tomorrowDay =
      plan && planStartedAt && tomorrowYmd
        ? getTodaysDay(plan, planStartedAt, tomorrowYmd)
        : null;
    const nextCalendarWorkout = tomorrowDay
      ? tomorrowDay.day.isRest
        ? `Rest (Day ${tomorrowDay.dayNumber})`
        : `Day ${tomorrowDay.dayNumber} — ${tomorrowDay.day.title}`
      : null;

    const workoutCompletedToday = !!(loggedDay && !loggedDay.day.isRest);

    const workoutStatus: InsightContext['workoutStatus'] = activeDay?.day.isRest
      ? 'rest'
      : workoutCompletedToday
        ? 'completed'
        : 'pending';

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
      workoutStatus,
      exercises:
        activeDay && !activeDay.day.isRest
          ? activeDay.day.exercises.map((e) => e.name).slice(0, 8)
          : [],
      workoutCompletedToday,
      nextCalendarWorkout,
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
      macroPct: {
        calories: pctOfTarget(calorieTarget, totalCal),
        protein: pctOfTarget(proteinTarget, totalProtein),
        carbs: pctOfTarget(carbTarget, totalCarbs),
        fat: pctOfTarget(fatTarget, totalFat),
      },
      mealsLogged,
      mealsMissing,
      caloriesBurnedToday: Math.round(caloriesBurnedToday),
      workoutStreak: computeWorkoutStreak(loggedDates, plan, planStartedAt),
      daysThisWeek: countDaysThisWeek(loggedDates),
      timeOfDayBucket: timeOfDayBucket(today),
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

    if (cachedDate === today && cachedText && cachedHash === contextHash) {
      const parsed = parseInsightText(cachedText);
      return NextResponse.json({ insight: parsed });
    }

    let payload: InsightPayload;
    if (!process.env.ANTHROPIC_API_KEY) {
      payload = buildRulesInsight(context);
    } else {
      const { text } = await generateText({
        model: anthropic(getAnthropicModelId()),
        system: [
          'You are a precise, encouraging fitness coach.',
          'Return ONLY valid JSON: {"headline":"...","body":"..."}.',
          'headline: 6-10 words, session-aware (mention workout name or Rest, and done/open when relevant).',
          'body: exactly 2-3 short sentences covering (1) today workout status with one training detail,',
          '(2) one concrete nutrition number (calories/protein remaining or % of target, or a missing meal),',
          '(3) a forward look using nextCalendarWorkout or recovery.',
          'No bullet points. No markdown fences.',
        ].join(' '),
        prompt: `User data today:\n${JSON.stringify(context, null, 2)}\n\nWrite today's insight JSON.`,
        maxTokens: 220,
      });
      payload = extractJsonObject(text) ?? buildRulesInsight(context);
      if (!payload.headline || !payload.body) {
        payload = buildRulesInsight(context);
      }
    }

    const stored = serializeInsight(payload);
    await User.findByIdAndUpdate(session.user.id, {
      $set: {
        lastInsightDate: today,
        lastInsightText: stored,
        lastInsightContextHash: contextHash,
        lastInsightGeneratedAt: new Date(),
      },
    });

    return NextResponse.json({ insight: payload });
  } catch (e) {
    console.error('Insight GET error:', e);
    return NextResponse.json({ insight: null });
  }
}
