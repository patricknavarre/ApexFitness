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
import { getRideCourse } from '@/lib/ride/courses';
import { getRideWorkout } from '@/lib/ride/workouts';
import {
  addLocalCalendarDays,
  dateOnlyToUtcNoon,
  planStartedAtForDayNumber,
  serializeDateOnly,
  todayLocal,
  toAppDateOnly,
} from '@/lib/local-date';

export const runtime = 'nodejs';
export const maxDuration = 30;

const DEFAULT_CALORIES_BURNED = 270;
const ALL_MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;
const RIDE_SOURCES = new Set(['ftms', 'cps', 'mock']);

type InsightPayload = {
  headline: string;
  body: string;
};

type RideInsight = {
  durationMinutes: number;
  caloriesBurned: number;
  avgPowerWatts: number | null;
  distanceMeters: number | null;
  trainingStressScore: number | null;
  rideXp: number | null;
  courseName: string | null;
  courseCompleted: boolean;
  workoutName: string | null;
  workoutCompleted: boolean;
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
  /** intake − workout burn; negative = deficit (e.g. ride on empty stomach) */
  calorieBalance: number;
  energyState: 'deficit' | 'surplus' | 'even';
  rideToday: RideInsight | null;
  ridesCompletedToday: number;
  rideXpEarnedToday: number;
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

function formatRideDistance(meters: number | null): string | null {
  if (meters == null || meters <= 0) return null;
  const mi = meters / 1609.344;
  if (mi < 0.1) return `${Math.round(meters * 3.28084)} ft`;
  return mi < 10 ? `${mi.toFixed(2)} mi` : `${mi.toFixed(1)} mi`;
}

function rideHighlight(ride: RideInsight): string {
  const bits: string[] = [];
  bits.push(`${ride.durationMinutes} min`);
  if (ride.avgPowerWatts != null && ride.avgPowerWatts > 0) {
    bits.push(`${ride.avgPowerWatts} W avg`);
  }
  const dist = formatRideDistance(ride.distanceMeters);
  if (dist) bits.push(dist);
  if (ride.caloriesBurned > 0) bits.push(`${ride.caloriesBurned} kcal burned`);
  if (ride.trainingStressScore != null && ride.trainingStressScore > 0) {
    bits.push(`TSS ${ride.trainingStressScore}`);
  }
  if (ride.courseName) {
    bits.push(
      ride.courseCompleted ? `${ride.courseName} finished` : `on ${ride.courseName}`
    );
  } else if (ride.workoutName) {
    bits.push(
      ride.workoutCompleted
        ? `${ride.workoutName} complete`
        : ride.workoutName
    );
  }
  if (ride.rideXp != null && ride.rideXp > 0) bits.push(`+${ride.rideXp} ride XP`);
  return bits.join(', ');
}

function balancePhrase(context: InsightContext): string {
  const bal = context.calorieBalance;
  if (bal < 0) {
    return `You're in a ${Math.abs(bal)} cal deficit from food vs burn — the work is pulling ahead.`;
  }
  if (bal > 0) {
    return `Energy balance sits at +${bal} cal (food minus burn).`;
  }
  return 'Food and burn are neck and neck today.';
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
  const ride = context.rideToday;

  if (ride) {
    const rideLine = `Ride locked in: ${rideHighlight(ride)}.`;
    const progressBit =
      context.daysThisWeek > 0
        ? ` That's ${context.daysThisWeek} training day${context.daysThisWeek === 1 ? '' : 's'} this week` +
          (context.workoutStreak > 0 ? ` and a ${context.workoutStreak}-day streak.` : '.')
        : '';
    if (context.energyState === 'deficit') {
      return {
        headline: 'Ride fueled the deficit',
        body: [
          rideLine + progressBit,
          balancePhrase(context),
          proteinPart
            ? `Refuel smart — ${proteinPart}. ${missing}`
            : `Log food when you're ready — ${calPart}. ${missing}`,
        ].join(' '),
      };
    }
    return {
      headline: ride.courseCompleted
        ? 'Course conquered'
        : ride.workoutCompleted
          ? 'Workout crushed'
          : 'Strong ride in the books',
      body: [
        rideLine + progressBit,
        balancePhrase(context),
        proteinPart
          ? `Recovery fuel: aim toward ${proteinPart}. ${missing}`
          : `Keep fueling — ${calPart}. ${forward}`,
      ].join(' '),
    };
  }

  if (context.workoutStatus === 'rest') {
    return {
      headline: 'Recovery day',
      body: [
        'Rest is on the plan — treat it as training for tomorrow.',
        proteinPart
          ? `Nutrition checkpoint: ${proteinPart}. ${missing}`
          : `Nutrition checkpoint: ${calPart}. ${missing}`,
        context.caloriesBurnedToday > 0
          ? `${balancePhrase(context)} ${forward}`
          : forward,
      ].join(' '),
    };
  }

  if (context.workoutStatus === 'completed') {
    const focus = context.exercises[0] ? ` Nice work locking in work like ${context.exercises[0]}.` : '';
    return {
      headline: `${context.todayWorkout} — done`,
      body: [
        `Session logged for ${context.todayWorkout}.${focus}`,
        context.caloriesBurnedToday > 0
          ? `${balancePhrase(context)} Burned ${context.caloriesBurnedToday} cal from training.`
          : '',
        proteinPart
          ? `Refuel toward ${proteinPart}. ${missing}`
          : `Keep fueling — ${calPart} so far. ${missing}`,
        forward,
      ]
        .filter(Boolean)
        .join(' '),
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
      context.caloriesBurnedToday > 0 ? balancePhrase(context) : null,
      proteinPart && context.remainingProtein != null && context.remainingProtein > 0
        ? `You're at ${proteinPart} — leave room to finish protein after training. ${missing}`
        : `Fuel check: ${calPart}. ${missing}`,
      forward,
    ]
      .filter(Boolean)
      .join(' '),
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
        .limit(100)
        .select(
          'planId dayNumber loggedAt caloriesBurned cardioExercise cardioDurationMinutes isRestDay exerciseName rideSource avgPowerWatts distanceMeters trainingStressScore rideXp courseId courseCompleted workoutId workoutCompleted'
        )
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
    const ridesToday: RideInsight[] = [];
    for (const log of workoutLogs) {
      if (!log.loggedAt) continue;
      const local = toAppDateOnly(new Date(log.loggedAt));
      loggedDates.add(local);
      if (local !== today) continue;

      const isSetLog = typeof log.exerciseName === 'string' && log.exerciseName.length > 0;
      const isRide =
        typeof log.rideSource === 'string' && RIDE_SOURCES.has(log.rideSource);

      if (isRide) {
        const burn =
          log.caloriesBurned != null ? Math.round(Number(log.caloriesBurned)) : 0;
        caloriesBurnedToday += burn;
        const course = getRideCourse(
          typeof log.courseId === 'string' ? log.courseId : null
        );
        const structured = getRideWorkout(
          typeof log.workoutId === 'string' ? log.workoutId : null
        );
        ridesToday.push({
          durationMinutes: Math.max(
            1,
            Math.round(Number(log.cardioDurationMinutes) || 0)
          ),
          caloriesBurned: burn,
          avgPowerWatts:
            typeof log.avgPowerWatts === 'number'
              ? Math.round(log.avgPowerWatts)
              : null,
          distanceMeters:
            typeof log.distanceMeters === 'number'
              ? Math.round(log.distanceMeters)
              : null,
          trainingStressScore:
            typeof log.trainingStressScore === 'number'
              ? Math.round(log.trainingStressScore)
              : null,
          rideXp:
            typeof log.rideXp === 'number' ? Math.round(log.rideXp) : null,
          courseName: course?.name ?? null,
          courseCompleted: Boolean(log.courseCompleted),
          workoutName: structured?.name ?? null,
          workoutCompleted: Boolean(log.workoutCompleted),
        });
        continue;
      }

      // Skip per-exercise set-logs (Save loads) — they have no session burn
      if (isSetLog) continue;
      if (log.isRestDay) continue;
      caloriesBurnedToday +=
        log.caloriesBurned != null
          ? Number(log.caloriesBurned)
          : DEFAULT_CALORIES_BURNED;
    }

    const rideToday = ridesToday[0] ?? null;
    const rideXpEarnedToday = ridesToday.reduce(
      (s, r) => s + (r.rideXp ?? 0),
      0
    );
    const calorieBalance = Math.round(totalCal - caloriesBurnedToday);
    const energyState: InsightContext['energyState'] =
      calorieBalance < 0 ? 'deficit' : calorieBalance > 0 ? 'surplus' : 'even';

    let plan = WORKOUT_PLANS.find((p) => p.id === user.activePlanId) ?? null;
    let planStartedAt = serializeDateOnly(user.planStartedAt as Date | undefined);
    let activePlanDayNumber =
      typeof user.activePlanDayNumber === 'number' ? user.activePlanDayNumber : null;
    let activePlanDaySetOn =
      typeof user.activePlanDaySetOn === 'string' ? user.activePlanDaySetOn : null;

    type PlanDayEvidence = {
      planId: string;
      dayNumber: number;
      fromSetsOnly: boolean;
    };

    const asPlanDayEvidence = (raw: unknown): PlanDayEvidence | null => {
      const log = raw as {
        loggedAt?: Date | string | null;
        planId?: string | null;
        dayNumber?: number | null;
        isRestDay?: boolean;
        exerciseName?: string | null;
      };
      if (!log.loggedAt) return null;
      if (toAppDateOnly(new Date(log.loggedAt)) !== today) return null;
      if (typeof log.planId !== 'string' || !log.planId || log.planId === 'youth-sd') return null;
      if (typeof log.dayNumber !== 'number') return null;
      if (log.isRestDay) return null;
      const fromSetsOnly =
        typeof log.exerciseName === 'string' && log.exerciseName.length > 0;
      return { planId: log.planId, dayNumber: log.dayNumber, fromSetsOnly };
    };

    // Prefer true session logs; fall back to set-only loads (same as Progress daily-summary).
    let todaysPlanLog: PlanDayEvidence | null = null;
    for (const preferSets of [false, true]) {
      if (todaysPlanLog) break;
      for (const log of workoutLogs) {
        const evidence = asPlanDayEvidence(log);
        if (!evidence || evidence.fromSetsOnly !== preferSets) continue;
        if (plan && evidence.planId === plan.id) {
          todaysPlanLog = evidence;
          break;
        }
      }
      if (todaysPlanLog) break;
      for (const log of workoutLogs) {
        const evidence = asPlanDayEvidence(log);
        if (!evidence || evidence.fromSetsOnly !== preferSets) continue;
        todaysPlanLog = evidence;
        break;
      }
    }

    if (todaysPlanLog) {
      const logPlan = WORKOUT_PLANS.find((p) => p.id === todaysPlanLog.planId) ?? null;
      const logged = logPlan
        ? getPlanDayByNumber(logPlan, todaysPlanLog.dayNumber)
        : null;
      if (logPlan && logged && !logged.day.isRest) {
        const scheduledOnActive =
          plan && planStartedAt
            ? getActivePlanDay(
                plan,
                planStartedAt,
                activePlanDayNumber,
                activePlanDaySetOn,
                today
              )
            : null;
        const needsHeal =
          logPlan.id !== plan?.id || scheduledOnActive?.dayNumber !== logged.dayNumber;

        if (needsHeal) {
          const healedStart = planStartedAtForDayNumber(logged.dayNumber, today);
          const startedAtDate = dateOnlyToUtcNoon(healedStart);
          await User.findByIdAndUpdate(session.user.id, {
            $set: {
              activePlanId: logPlan.id,
              ...(startedAtDate ? { planStartedAt: startedAtDate } : {}),
              activePlanDayNumber: null,
              activePlanDaySetOn: null,
            },
          });
          plan = logPlan;
          planStartedAt = healedStart;
          activePlanDayNumber = null;
          activePlanDaySetOn = null;
        } else {
          plan = logPlan;
        }
      }
    }

    const scheduledDay =
      plan && planStartedAt
        ? getActivePlanDay(
            plan,
            planStartedAt,
            activePlanDayNumber,
            activePlanDaySetOn,
            today
          )
        : null;

    // Prefer the day actually trained today over a stale "next day" override.
    const loggedDay =
      plan && todaysPlanLog && todaysPlanLog.planId === plan.id
        ? getPlanDayByNumber(plan, todaysPlanLog.dayNumber)
        : null;

    const activeDay =
      loggedDay && !loggedDay.day.isRest
        ? { ...loggedDay, isManual: false as const }
        : scheduledDay;

    // Heal stale jump-ahead override so subsequent reads agree (same plan).
    if (
      loggedDay &&
      !loggedDay.day.isRest &&
      activePlanDaySetOn === today &&
      activePlanDayNumber != null &&
      activePlanDayNumber !== loggedDay.dayNumber
    ) {
      await User.findByIdAndUpdate(session.user.id, {
        $set: {
          activePlanDayNumber: loggedDay.dayNumber,
          activePlanDaySetOn: today,
        },
      });
      activePlanDayNumber = loggedDay.dayNumber;
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
      ? rideToday
        ? 'completed'
        : 'rest'
      : workoutCompletedToday || !!rideToday
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

    const todayWorkoutLabel = (() => {
      if (rideToday) {
        if (rideToday.courseName) {
          return rideToday.courseCompleted
            ? `Virtual ride — ${rideToday.courseName}`
            : `Virtual ride · ${rideToday.courseName}`;
        }
        if (rideToday.workoutName) {
          return `Virtual ride — ${rideToday.workoutName}`;
        }
        return `Virtual ride · ${rideToday.durationMinutes} min`;
      }
      if (activeDay) {
        return activeDay.day.isRest
          ? `Rest day (Day ${activeDay.dayNumber})`
          : `Day ${activeDay.dayNumber} — ${activeDay.day.title}`;
      }
      return 'No active plan';
    })();

    const context: InsightContext = {
      goal: (user.goal as string) ?? 'not set',
      todayWorkout: todayWorkoutLabel,
      isRestDay: activeDay?.day.isRest ?? false,
      workoutStatus,
      exercises:
        activeDay && !activeDay.day.isRest
          ? activeDay.day.exercises.map((e) => e.name).slice(0, 8)
          : [],
      workoutCompletedToday: workoutCompletedToday || !!rideToday,
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
      calorieBalance,
      energyState,
      rideToday,
      ridesCompletedToday: ridesToday.length,
      rideXpEarnedToday,
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
          'You are a precise, encouraging fitness coach who celebrates training and honest energy balance.',
          'Return ONLY valid JSON: {"headline":"...","body":"..."}.',
          'headline: 6-10 words, session-aware (mention Virtual ride / course / workout name or Rest, and done/open when relevant).',
          'body: exactly 2-3 short sentences covering:',
          '(1) today training status — if rideToday exists, cite concrete ride numbers (minutes, watts, distance, kcal, TSS, course, or ride XP) and how it advances daysThisWeek / workoutStreak / goal;',
          '(2) energy balance using calorieBalance and energyState (negative calorieBalance = deficit from food minus burn — motivate without guilt; empty-stomach training driving a deficit is progress toward fat-loss goals when goal implies that);',
          '(3) one nutrition cue (protein remaining / missing meal) OR a forward look with nextCalendarWorkout.',
          'Never invent ride stats that are null. No bullet points. No markdown fences.',
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
