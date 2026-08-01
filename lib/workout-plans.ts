import { diffLocalCalendarDays, todayLocal } from '@/lib/local-date';

export type WorkoutExercise = {
  name: string;
  sets: string;
  reps: string;
};

export type WorkoutDay = {
  dayNumber: number;
  title: string;
  isRest: boolean;
  exercises: WorkoutExercise[];
};

export type WorkoutPlan = {
  id: string;
  name: string;
  goal: string;
  daysPerWeek: number;
  repRange: string;
  rest: string;
  equipment: 'none' | 'home' | 'full' | 'specialty';
  days: WorkoutDay[];
  interactive?: boolean;
  progressionRules?: string[];
  nutritionReminders?: string[];
  notes?: string[];
};

/** Get today's workout day from plan start date (uses local calendar date). */
export function getTodaysDay(
  plan: WorkoutPlan,
  planStartedAt: string,
  today: string = todayLocal()
): { day: WorkoutDay; dayNumber: number } | null {
  const diffDays = diffLocalCalendarDays(planStartedAt.slice(0, 10), today);
  if (diffDays == null || diffDays < 0 || plan.days.length === 0) return null;
  const dayIndex = diffDays % plan.days.length;
  const day = plan.days[dayIndex];
  return { day, dayNumber: day.dayNumber };
}

/** Next workout day after a completed day, skipping rest days and wrapping. */
export function getNextPlanDayNumber(plan: WorkoutPlan, completedDayNumber: number): number {
  const days = plan.days;
  if (days.length === 0) return completedDayNumber;
  const idx = days.findIndex((d) => d.dayNumber === completedDayNumber);
  if (idx === -1) return completedDayNumber;
  for (let step = 1; step <= days.length; step++) {
    const next = days[(idx + step) % days.length];
    if (!next.isRest) return next.dayNumber;
  }
  return completedDayNumber;
}

/**
 * Resolve the user's current plan day.
 * Manual override applies only when activePlanDaySetOn matches today's local date;
 * otherwise the calendar schedule from planStartedAt is used.
 */
export function getActivePlanDay(
  plan: WorkoutPlan,
  planStartedAt: string | null,
  activePlanDayNumber: number | null,
  activePlanDaySetOn: string | null = null,
  today: string = todayLocal()
): { day: WorkoutDay; dayNumber: number; isManual: boolean } | null {
  const overrideFresh =
    activePlanDayNumber != null &&
    typeof activePlanDaySetOn === 'string' &&
    activePlanDaySetOn === today;
  if (overrideFresh) {
    const day = plan.days.find((d) => d.dayNumber === activePlanDayNumber);
    if (day) return { day, dayNumber: day.dayNumber, isManual: true };
  }
  if (!planStartedAt) return null;
  const auto = getTodaysDay(plan, planStartedAt, today);
  if (!auto) return null;
  return { ...auto, isManual: false };
}

/** Look up a plan day by number. */
export function getPlanDayByNumber(
  plan: WorkoutPlan,
  dayNumber: number
): { day: WorkoutDay; dayNumber: number } | null {
  const day = plan.days.find((d) => d.dayNumber === dayNumber);
  if (!day) return null;
  return { day, dayNumber: day.dayNumber };
}

export const WORKOUT_PLANS: WorkoutPlan[] = [
  {
    id: '5-day-muscle',
    name: '5-Day Muscle Building',
    goal: 'Maximum muscle growth — full gym',
    daysPerWeek: 5,
    repRange: '8–15 reps',
    rest: '60–90 seconds between sets',
    equipment: 'full',
    days: [
      {
        dayNumber: 1,
        title: 'Upper Push',
        isRest: false,
        exercises: [
          { name: 'Flat Bench Press', sets: '3-4', reps: '8-12' },
          { name: 'Incline DB Press', sets: '3', reps: '10-12' },
          { name: 'Overhead Press', sets: '3', reps: '8-12' },
          { name: 'Cable Lateral Raise', sets: '3', reps: '12-15' },
          { name: 'Cable Tricep Pushdown', sets: '3', reps: '12-15' },
          { name: 'Cable Chest Fly', sets: '2-3', reps: '12-15' },
        ],
      },
      {
        dayNumber: 2,
        title: 'Lower Body',
        isRest: false,
        exercises: [
          { name: 'Back Squat or Leg Press', sets: '3-4', reps: '8-12' },
          { name: 'Romanian Deadlift', sets: '3-4', reps: '8-12' },
          { name: 'Seated Leg Curl', sets: '3-4', reps: '10-15' },
          { name: 'Walking Lunge or Split Squat', sets: '3', reps: '10/leg' },
          { name: 'Standing Calf Raise', sets: '4', reps: '12-20' },
          { name: 'Band Ankle 4-Way (finisher)', sets: '2', reps: '10 each direction' },
        ],
      },
      {
        dayNumber: 3,
        title: 'Upper Pull',
        isRest: false,
        exercises: [
          { name: 'Barbell or Cable Row', sets: '4', reps: '8-12' },
          { name: 'Lat Pulldown', sets: '3', reps: '10-12' },
          { name: 'Cable Face Pull', sets: '3', reps: '15-20' },
          { name: 'Straight-Arm Cable Pulldown', sets: '3', reps: '12-15' },
          { name: 'DB Shrug', sets: '3', reps: '12-15' },
          { name: 'DB Curl', sets: '3', reps: '10-12' },
        ],
      },
      { dayNumber: 4, title: 'Rest', isRest: true, exercises: [] },
      {
        dayNumber: 5,
        title: 'Lower Body (Volume)',
        isRest: false,
        exercises: [
          { name: 'Leg Press', sets: '3-4', reps: '10-15' },
          { name: 'Bulgarian Split Squat', sets: '3', reps: '10-12/leg' },
          { name: 'Seated Leg Curl', sets: '3-4', reps: '12-15' },
          { name: 'Leg Extension', sets: '3', reps: '12-15' },
          { name: 'Step-Up', sets: '3', reps: '10/leg' },
          { name: 'Seated Calf Raise', sets: '3', reps: '15-20' },
          { name: 'Single-Leg Balance', sets: '2', reps: '30 sec/side' },
        ],
      },
      {
        dayNumber: 6,
        title: 'Arms & Shoulders',
        isRest: false,
        exercises: [
          { name: 'Close-Grip Bench Press', sets: '3', reps: '8-12' },
          { name: 'Overhead Cable Tricep Extension', sets: '3', reps: '12-15' },
          { name: 'Cable Tricep Pushdown', sets: '2', reps: '15' },
          { name: 'Incline DB Curl', sets: '3', reps: '10-12' },
          { name: 'Hammer Curl', sets: '3', reps: '10-12' },
          { name: 'Cable Curl', sets: '2', reps: '12-15' },
          { name: 'Cable Lateral Raise', sets: '3', reps: '12-15' },
        ],
      },
      { dayNumber: 7, title: 'Rest', isRest: true, exercises: [] },
    ],
    progressionRules: [
      'Add reps each week within the range',
      'When you hit top of range for all sets, increase weight 5–10 lbs',
      'Train within 2–3 reps of failure',
      'Deload every 6 weeks (reduce volume 50%)',
      'Keep ankle finishers pain-free — regress if swelling returns',
    ],
    nutritionReminders: [
      'Protein: 0.8–1g per lb bodyweight',
      'Calorie surplus: +200–400 daily',
      'Creatine: 5g daily',
      'Sleep: 7–9 hours',
    ],
    notes: [
      'Full gym version — barbells, cables, and machines',
      'Avoid heavy loads due to hernia history',
      'Focus on controlled form, not max weight',
      'Post-boot: prefer leg press over heavy squats until ankle feels solid',
    ],
  },
  {
    id: '3-day-full-body',
    name: '3-Day Full Body',
    goal: 'Build strength and muscle with minimal days — full gym',
    daysPerWeek: 3,
    repRange: '8–12 reps',
    rest: '90–120 seconds',
    equipment: 'full',
    days: [
      {
        dayNumber: 1,
        title: 'Full Body A',
        isRest: false,
        exercises: [
          { name: 'Goblet Squat or Leg Press', sets: '3', reps: '10-12' },
          { name: 'Bench Press', sets: '3', reps: '8-12' },
          { name: 'Seated Cable Row', sets: '3', reps: '10-12' },
          { name: 'Romanian Deadlift', sets: '3', reps: '10-12' },
          { name: 'Overhead Press', sets: '2', reps: '10-12' },
          { name: 'Standing Calf Raise', sets: '2', reps: '12-15' },
          { name: 'Plank', sets: '2', reps: '30-45 sec' },
        ],
      },
      { dayNumber: 2, title: 'Rest', isRest: true, exercises: [] },
      {
        dayNumber: 3,
        title: 'Full Body B',
        isRest: false,
        exercises: [
          { name: 'Split Squat or Walking Lunge', sets: '3', reps: '10/leg' },
          { name: 'Incline DB Press', sets: '3', reps: '10-12' },
          { name: 'Lat Pulldown', sets: '3', reps: '8-12' },
          { name: 'Seated Leg Curl', sets: '2', reps: '12-15' },
          { name: 'DB Curl', sets: '2', reps: '10-12' },
          { name: 'Cable Tricep Pushdown', sets: '2', reps: '12-15' },
          { name: 'Single-Leg Balance', sets: '2', reps: '30 sec/side' },
        ],
      },
      { dayNumber: 4, title: 'Rest', isRest: true, exercises: [] },
      {
        dayNumber: 5,
        title: 'Full Body C',
        isRest: false,
        exercises: [
          { name: 'Back Squat or Leg Press', sets: '3', reps: '8-10' },
          { name: 'Bench Press', sets: '3', reps: '8-12' },
          { name: 'Barbell or Cable Row', sets: '3', reps: '10-12' },
          { name: 'Hip Thrust', sets: '3', reps: '12-15' },
          { name: 'Cable Lateral Raise', sets: '2', reps: '12-15' },
          { name: 'Seated Calf Raise', sets: '2', reps: '15-20' },
          { name: 'Dead Bug', sets: '2', reps: '8/side' },
        ],
      },
      { dayNumber: 6, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 7, title: 'Rest', isRest: true, exercises: [] },
    ],
    progressionRules: [
      'Add weight when you complete all sets at top of rep range',
      'Keep one rest day between training days',
    ],
    nutritionReminders: [
      'Protein: 0.8g+ per lb bodyweight',
      'Eat at maintenance or slight surplus for muscle',
    ],
    notes: [
      'Full gym access — use machines to spare the ankle early on',
      'Pair with Ankle Strength PT on rest days if desired',
    ],
  },
  {
    id: '4-day-upper-lower',
    name: '4-Day Upper/Lower',
    goal: 'Balanced hypertrophy and strength',
    daysPerWeek: 4,
    repRange: '6–12 reps (compound), 10–15 (isolation)',
    rest: '60–90 seconds',
    equipment: 'full',
    days: [
      {
        dayNumber: 1,
        title: 'Upper A',
        isRest: false,
        exercises: [
          { name: 'Bench Press', sets: '4', reps: '6-10' },
          { name: 'Overhead Press', sets: '3', reps: '8-10' },
          { name: 'Barbell or DB Row', sets: '4', reps: '8-10' },
          { name: 'Lat Pulldown', sets: '3', reps: '10-12' },
          { name: 'Lateral Raises', sets: '3', reps: '12-15' },
          { name: 'Tricep Pushdown', sets: '2', reps: '12-15' },
          { name: 'Bicep Curl', sets: '2', reps: '10-12' },
        ],
      },
      {
        dayNumber: 2,
        title: 'Lower A',
        isRest: false,
        exercises: [
          { name: 'Squat or Leg Press', sets: '4', reps: '6-10' },
          { name: 'Romanian Deadlift', sets: '3', reps: '8-10' },
          { name: 'Leg Press', sets: '3', reps: '10-12' },
          { name: 'Leg Curl', sets: '3', reps: '10-12' },
          { name: 'Calf Raises', sets: '3', reps: '15-20' },
          { name: 'Band Ankle 4-Way (finisher)', sets: '2', reps: '10 each direction' },
        ],
      },
      { dayNumber: 3, title: 'Rest', isRest: true, exercises: [] },
      {
        dayNumber: 4,
        title: 'Upper B',
        isRest: false,
        exercises: [
          { name: 'Incline DB Press', sets: '3', reps: '8-12' },
          { name: 'DB Row', sets: '3', reps: '10-12' },
          { name: 'Face Pull', sets: '3', reps: '15-20' },
          { name: 'Cable or DB Fly', sets: '2', reps: '12-15' },
          { name: 'Skull Crushers', sets: '2', reps: '10-12' },
          { name: 'Hammer Curl', sets: '2', reps: '10-12' },
        ],
      },
      {
        dayNumber: 5,
        title: 'Lower B',
        isRest: false,
        exercises: [
          { name: 'Deadlift', sets: '3', reps: '6-8' },
          { name: 'Front Squat or Leg Press', sets: '3', reps: '8-10' },
          { name: 'Bulgarian Split Squat', sets: '3', reps: '10/leg' },
          { name: 'Leg Curl', sets: '3', reps: '12-15' },
          { name: 'Calf Raises', sets: '3', reps: '15-20' },
          { name: 'Single-Leg Balance', sets: '2', reps: '30 sec/side' },
        ],
      },
      { dayNumber: 6, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 7, title: 'Rest', isRest: true, exercises: [] },
    ],
    progressionRules: [
      'Progressive overload: add weight or reps each week',
      'Alternate Upper A/Lower A and Upper B/Lower B',
    ],
  },
  {
    id: '3-day-beginner',
    name: '3-Day Beginner',
    goal: 'Learn movements and build habits',
    daysPerWeek: 3,
    repRange: '10–15 reps',
    rest: '60–90 seconds',
    equipment: 'none',
    days: [
      {
        dayNumber: 1,
        title: 'Workout A',
        isRest: false,
        exercises: [
          { name: 'Bodyweight or Goblet Squat', sets: '3', reps: '10-12' },
          { name: 'Push-ups (or knee push-ups)', sets: '3', reps: '8-12' },
          { name: 'Band or DB Row', sets: '3', reps: '10-12' },
          { name: 'Glute Bridge', sets: '2', reps: '12-15' },
          { name: 'Bird Dog', sets: '2', reps: '8/side' },
        ],
      },
      { dayNumber: 2, title: 'Rest', isRest: true, exercises: [] },
      {
        dayNumber: 3,
        title: 'Workout B',
        isRest: false,
        exercises: [
          { name: 'Bodyweight Lunge', sets: '3', reps: '10/leg' },
          { name: 'DB Overhead Press', sets: '3', reps: '10-12' },
          { name: 'Band Lat Pulldown', sets: '3', reps: '10-12' },
          { name: 'Romanian Deadlift (light)', sets: '2', reps: '12' },
          { name: 'Dead Bug', sets: '2', reps: '8/side' },
        ],
      },
      { dayNumber: 4, title: 'Rest', isRest: true, exercises: [] },
      {
        dayNumber: 5,
        title: 'Workout C',
        isRest: false,
        exercises: [
          { name: 'Squat', sets: '3', reps: '10-12' },
          { name: 'Incline Push-up', sets: '3', reps: '10-12' },
          { name: 'Row', sets: '3', reps: '10-12' },
          { name: 'Leg Raise or Knee Tuck', sets: '2', reps: '10-12' },
          { name: 'Plank', sets: '2', reps: '20-30 sec' },
        ],
      },
      { dayNumber: 6, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 7, title: 'Rest', isRest: true, exercises: [] },
    ],
    progressionRules: [
      'Focus on form before adding weight',
      'Rest at least one day between sessions',
    ],
    notes: ['Use bands or light dumbbells if no gym access'],
  },
  {
    id: '2-day-beginner',
    name: '2-Day Total Body Beginner',
    goal: 'Build a habit with minimal time; 2 days/week',
    daysPerWeek: 2,
    repRange: '10–15 reps',
    rest: '60–90 seconds',
    equipment: 'none',
    days: [
      {
        dayNumber: 1,
        title: 'Workout A',
        isRest: false,
        exercises: [
          { name: 'Bodyweight or Goblet Squat', sets: '3', reps: '10-12' },
          { name: 'Push-ups', sets: '3', reps: '8-12' },
          { name: 'Band or Inverted Row', sets: '3', reps: '10-12' },
          { name: 'Romanian Deadlift (bodyweight or light)', sets: '2', reps: '12' },
          { name: 'Plank', sets: '2', reps: '30-45 sec' },
        ],
      },
      { dayNumber: 2, title: 'Rest', isRest: true, exercises: [] },
      {
        dayNumber: 3,
        title: 'Workout B',
        isRest: false,
        exercises: [
          { name: 'Bodyweight Lunge', sets: '3', reps: '10/leg' },
          { name: 'Push-up or Pike Push-up', sets: '3', reps: '8-12' },
          { name: 'Band Lat Pulldown or Pull-up', sets: '3', reps: '8-12' },
          { name: 'Glute Bridge', sets: '2', reps: '12-15' },
          { name: 'Dead Bug', sets: '2', reps: '8/side' },
        ],
      },
      { dayNumber: 4, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 5, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 6, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 7, title: 'Rest', isRest: true, exercises: [] },
    ],
    progressionRules: [
      'Add reps or difficulty each week',
      'Rest at least one day between sessions',
    ],
  },
  {
    id: '4-day-beginner-split',
    name: '4-Day Beginner Split',
    goal: 'Ease into a 4-day schedule with upper/lower',
    daysPerWeek: 4,
    repRange: '10–12 reps',
    rest: '60–90 seconds',
    equipment: 'home',
    days: [
      {
        dayNumber: 1,
        title: 'Upper A',
        isRest: false,
        exercises: [
          { name: 'Push-up or DB Bench', sets: '3', reps: '10-12' },
          { name: 'DB or Band Row', sets: '3', reps: '10-12' },
          { name: 'Overhead Press', sets: '2', reps: '10-12' },
          { name: 'Band or DB Curl', sets: '2', reps: '10-12' },
          { name: 'Tricep Pushdown or Diamond Push-up', sets: '2', reps: '12' },
        ],
      },
      {
        dayNumber: 2,
        title: 'Lower A',
        isRest: false,
        exercises: [
          { name: 'Goblet Squat', sets: '3', reps: '10-12' },
          { name: 'Romanian Deadlift', sets: '3', reps: '10-12' },
          { name: 'Split Squat', sets: '2', reps: '10/leg' },
          { name: 'Glute Bridge', sets: '2', reps: '12-15' },
          { name: 'Calf Raises', sets: '2', reps: '15-20' },
        ],
      },
      { dayNumber: 3, title: 'Rest', isRest: true, exercises: [] },
      {
        dayNumber: 4,
        title: 'Upper B',
        isRest: false,
        exercises: [
          { name: 'Incline DB Press', sets: '3', reps: '10-12' },
          { name: 'Row', sets: '3', reps: '10-12' },
          { name: 'Lateral Raises', sets: '2', reps: '12-15' },
          { name: 'Hammer Curl', sets: '2', reps: '10-12' },
          { name: 'Tricep Extension', sets: '2', reps: '12' },
        ],
      },
      {
        dayNumber: 5,
        title: 'Lower B',
        isRest: false,
        exercises: [
          { name: 'Goblet or Back Squat', sets: '3', reps: '10-12' },
          { name: 'Leg Curl or Nordic', sets: '2', reps: '10-12' },
          { name: 'Walking Lunge', sets: '2', reps: '12/leg' },
          { name: 'Hip Thrust', sets: '2', reps: '12-15' },
          { name: 'Calf Raises', sets: '2', reps: '15-20' },
        ],
      },
      { dayNumber: 6, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 7, title: 'Rest', isRest: true, exercises: [] },
    ],
    progressionRules: ['Add weight when you hit top of rep range'],
  },
  {
    id: '5-day-ppl',
    name: '5-Day Push/Pull/Legs',
    goal: 'Hypertrophy with clear push/pull/legs split',
    daysPerWeek: 5,
    repRange: '6–10 (compound), 10–15 (isolation)',
    rest: '60–90 seconds',
    equipment: 'full',
    days: [
      {
        dayNumber: 1,
        title: 'Push',
        isRest: false,
        exercises: [
          { name: 'Bench Press', sets: '4', reps: '6-10' },
          { name: 'Overhead Press', sets: '3', reps: '8-10' },
          { name: 'Incline DB Fly', sets: '3', reps: '12-15' },
          { name: 'Lateral Raises', sets: '3', reps: '12-15' },
          { name: 'Tricep Pushdown', sets: '2', reps: '12-15' },
          { name: 'Overhead Tricep Extension', sets: '2', reps: '10-12' },
        ],
      },
      {
        dayNumber: 2,
        title: 'Pull',
        isRest: false,
        exercises: [
          { name: 'Barbell Row', sets: '4', reps: '6-10' },
          { name: 'Lat Pulldown', sets: '3', reps: '10-12' },
          { name: 'Face Pull', sets: '3', reps: '15-20' },
          { name: 'DB Curl', sets: '3', reps: '10-12' },
          { name: 'Hammer Curl', sets: '2', reps: '12' },
        ],
      },
      {
        dayNumber: 3,
        title: 'Legs',
        isRest: false,
        exercises: [
          { name: 'Squat', sets: '4', reps: '6-10' },
          { name: 'Romanian Deadlift', sets: '3', reps: '8-10' },
          { name: 'Leg Press', sets: '3', reps: '10-12' },
          { name: 'Leg Curl', sets: '3', reps: '10-12' },
          { name: 'Calf Raises', sets: '3', reps: '15-20' },
        ],
      },
      {
        dayNumber: 4,
        title: 'Push',
        isRest: false,
        exercises: [
          { name: 'Incline DB Press', sets: '4', reps: '8-10' },
          { name: 'Overhead Press', sets: '3', reps: '8-10' },
          { name: 'Cable Fly', sets: '3', reps: '12-15' },
          { name: 'Lateral Raises', sets: '3', reps: '12-15' },
          { name: 'Skull Crushers', sets: '2', reps: '10-12' },
          { name: 'Tricep Pushdown', sets: '2', reps: '12-15' },
        ],
      },
      {
        dayNumber: 5,
        title: 'Pull',
        isRest: false,
        exercises: [
          { name: 'Deadlift', sets: '3', reps: '6-8' },
          { name: 'Lat Pulldown', sets: '3', reps: '10-12' },
          { name: 'Cable Row', sets: '3', reps: '10-12' },
          { name: 'Face Pull', sets: '2', reps: '15-20' },
          { name: 'Barbell Curl', sets: '2', reps: '10-12' },
          { name: 'Preacher Curl', sets: '2', reps: '12' },
        ],
      },
      { dayNumber: 6, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 7, title: 'Rest', isRest: true, exercises: [] },
    ],
    progressionRules: ['Progressive overload; deload every 5–6 weeks'],
  },
  {
    id: '6-day-ppl-volume',
    name: '6-Day PPL (High Volume)',
    goal: 'Maximum volume for advanced lifters',
    daysPerWeek: 6,
    repRange: '8–12 (compound), 12–15 (isolation)',
    rest: '60–90 seconds',
    equipment: 'full',
    days: [
      {
        dayNumber: 1,
        title: 'Push A',
        isRest: false,
        exercises: [
          { name: 'Bench Press', sets: '4', reps: '8-10' },
          { name: 'Overhead Press', sets: '3', reps: '8-10' },
          { name: 'Incline DB Press', sets: '3', reps: '10-12' },
          { name: 'Cable Fly', sets: '3', reps: '12-15' },
          { name: 'Lateral Raises', sets: '3', reps: '12-15' },
          { name: 'Tricep Pushdown', sets: '3', reps: '12-15' },
          { name: 'Overhead Extension', sets: '2', reps: '12' },
        ],
      },
      {
        dayNumber: 2,
        title: 'Pull A',
        isRest: false,
        exercises: [
          { name: 'Barbell Row', sets: '4', reps: '8-10' },
          { name: 'Lat Pulldown', sets: '3', reps: '10-12' },
          { name: 'Face Pull', sets: '3', reps: '15-20' },
          { name: 'DB Row', sets: '2', reps: '10-12' },
          { name: 'Barbell Curl', sets: '3', reps: '10-12' },
          { name: 'Hammer Curl', sets: '2', reps: '12' },
        ],
      },
      {
        dayNumber: 3,
        title: 'Legs A',
        isRest: false,
        exercises: [
          { name: 'Squat', sets: '4', reps: '8-10' },
          { name: 'Romanian Deadlift', sets: '3', reps: '10' },
          { name: 'Leg Press', sets: '3', reps: '12-15' },
          { name: 'Leg Curl', sets: '3', reps: '12-15' },
          { name: 'Leg Extension', sets: '2', reps: '12-15' },
          { name: 'Calf Raises', sets: '4', reps: '15-20' },
        ],
      },
      {
        dayNumber: 4,
        title: 'Push B',
        isRest: false,
        exercises: [
          { name: 'Incline Barbell Press', sets: '4', reps: '8-10' },
          { name: 'DB Shoulder Press', sets: '3', reps: '10-12' },
          { name: 'Flat DB Fly', sets: '3', reps: '12-15' },
          { name: 'Lateral Raises', sets: '3', reps: '12-15' },
          { name: 'Skull Crushers', sets: '3', reps: '10-12' },
          { name: 'Tricep Kickback', sets: '2', reps: '12-15' },
        ],
      },
      {
        dayNumber: 5,
        title: 'Pull B',
        isRest: false,
        exercises: [
          { name: 'Deadlift', sets: '3', reps: '6-8' },
          { name: 'Pull-ups', sets: '3', reps: '8-12' },
          { name: 'Cable Row', sets: '3', reps: '10-12' },
          { name: 'Face Pull', sets: '2', reps: '15-20' },
          { name: 'Incline DB Curl', sets: '3', reps: '10-12' },
          { name: 'Cable Curl', sets: '2', reps: '12' },
        ],
      },
      {
        dayNumber: 6,
        title: 'Legs B',
        isRest: false,
        exercises: [
          { name: 'Front Squat', sets: '3', reps: '8-10' },
          { name: 'Leg Press', sets: '4', reps: '10-12' },
          { name: 'Leg Curl', sets: '3', reps: '12-15' },
          { name: 'Bulgarian Split Squat', sets: '3', reps: '10/leg' },
          { name: 'Leg Extension', sets: '2', reps: '12-15' },
          { name: 'Seated Calf Raise', sets: '4', reps: '15-20' },
        ],
      },
      { dayNumber: 7, title: 'Rest', isRest: true, exercises: [] },
    ],
    progressionRules: ['Deload every 4–6 weeks', 'Prioritize recovery and sleep'],
  },
  {
    id: '5-day-strength',
    name: '5-Day Strength',
    goal: 'Prioritize strength on main lifts',
    daysPerWeek: 5,
    repRange: '4–6 (main), 6–10 (accessory)',
    rest: '2–3 min (main), 90 sec (accessory)',
    equipment: 'full',
    days: [
      {
        dayNumber: 1,
        title: 'Lower (Squat)',
        isRest: false,
        exercises: [
          { name: 'Squat', sets: '5', reps: '4-6' },
          { name: 'Romanian Deadlift', sets: '3', reps: '6-8' },
          { name: 'Leg Press', sets: '3', reps: '8-10' },
          { name: 'Leg Curl', sets: '2', reps: '8-10' },
          { name: 'Calf Raises', sets: '3', reps: '10-12' },
        ],
      },
      {
        dayNumber: 2,
        title: 'Upper (Bench)',
        isRest: false,
        exercises: [
          { name: 'Bench Press', sets: '5', reps: '4-6' },
          { name: 'Overhead Press', sets: '3', reps: '6-8' },
          { name: 'Barbell Row', sets: '3', reps: '6-8' },
          { name: 'Lat Pulldown', sets: '2', reps: '8-10' },
          { name: 'Tricep Pushdown', sets: '2', reps: '8-10' },
          { name: 'Bicep Curl', sets: '2', reps: '8-10' },
        ],
      },
      { dayNumber: 3, title: 'Rest', isRest: true, exercises: [] },
      {
        dayNumber: 4,
        title: 'Lower (Deadlift)',
        isRest: false,
        exercises: [
          { name: 'Deadlift', sets: '4', reps: '4-6' },
          { name: 'Front Squat', sets: '3', reps: '6-8' },
          { name: 'Leg Curl', sets: '3', reps: '8-10' },
          { name: 'Bulgarian Split Squat', sets: '2', reps: '8/leg' },
          { name: 'Calf Raises', sets: '3', reps: '10-12' },
        ],
      },
      {
        dayNumber: 5,
        title: 'Upper (OHP)',
        isRest: false,
        exercises: [
          { name: 'Overhead Press', sets: '5', reps: '4-6' },
          { name: 'Bench Press', sets: '3', reps: '6-8' },
          { name: 'Barbell Row', sets: '3', reps: '6-8' },
          { name: 'Face Pull', sets: '2', reps: '12-15' },
          { name: 'Close-Grip Bench', sets: '2', reps: '8-10' },
          { name: 'Barbell Curl', sets: '2', reps: '8-10' },
        ],
      },
      { dayNumber: 6, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 7, title: 'Rest', isRest: true, exercises: [] },
    ],
    progressionRules: ['Linear or periodized progression', 'Deload when needed'],
  },
  {
    id: 'recovery',
    name: 'Post-Boot Gym Return',
    goal: 'Full-gym rebuild after walking boot — progressive lower body + ankle finishers',
    daysPerWeek: 5,
    repRange: '8–15 reps',
    rest: '60–90 seconds (use built-in rest timer)',
    equipment: 'specialty',
    interactive: true,
    days: [
      { dayNumber: 1, title: 'Push', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 2, title: 'Pull', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 3, title: 'Lower + Ankle', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 4, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 5, title: 'Push', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 6, title: 'Pull', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 7, title: 'Rest / Ankle PT optional', isRest: true, exercises: [] },
    ],
    progressionRules: [
      'Standing allowed — start with machines and supported single-leg work',
      'Keep ankle pain ≤3/10 during and after sessions',
      'Add load weekly only if next-day swelling/limp stays flat',
      'Tap each set as you complete it; rest timer launches automatically',
    ],
    notes: [
      'Graduated from seated recovery — you are back on your feet',
      'Prefer leg press and goblet squats before heavy barbell squats',
      'Pair with Ankle Strength PT on rest days for extra rehab volume',
      'Use Workout Mode for set tracking and rest timer',
    ],
  },
  {
    id: 'ankle-pt',
    name: 'Ankle Strength PT',
    goal: 'Rebuild ankle strength, balance, and mobility — bike for cardio, minimal leg loading',
    daysPerWeek: 4,
    repRange: '10–20 reps / timed holds',
    rest: '45–60 seconds (use built-in rest timer)',
    equipment: 'specialty',
    interactive: true,
    days: [
      { dayNumber: 1, title: 'Ankle Strength', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 2, title: 'Balance & Proprioception', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 3, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 4, title: 'Ankle Strength', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 5, title: 'Mobility & Bike', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 6, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 7, title: 'Rest', isRest: true, exercises: [] },
    ],
    progressionRules: [
      'Match volume on both ankles',
      'Progress: double-leg → single-leg; firm ground → soft surface; eyes open → closed',
      'Cardio = easy bike only — no running (PT guidance)',
      'Stop for sharp pain, sudden swelling, or next-day limp',
      'Sessions are short (~20–35 min) — quality over grind',
    ],
    notes: [
      'Can use as your main plan or on rest days alongside Gym Return / muscle plans',
      'Band 4-way + light balance is the core — leg loading stays minimal while recovering',
      'Bike instead of run/walk for endurance days',
      'Not a substitute for clinician guidance if you have surgical restrictions',
      'Use Workout Mode for set tracking and rest timer',
    ],
  },
  {
    id: 'lt-dan',
    name: 'LT Dan Plan',
    goal: "I ain't got no legs — upper body only",
    daysPerWeek: 4,
    repRange: '10–15 reps',
    rest: '60–90 seconds (use built-in rest timer)',
    equipment: 'specialty',
    interactive: true,
    days: [
      { dayNumber: 1, title: 'Push — Shrimp Boat Press', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 2, title: 'Pull — Net Mending Rows', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 3, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 4, title: 'Arms & Core — Magic Legs Not Included', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 5, title: 'Push Volume', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 6, title: 'Pull Volume', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 7, title: 'Rest', isRest: true, exercises: [] },
    ],
    progressionRules: [
      'Zero leg exercises — by design',
      'All seated or lying — Lt. Dan approved',
      'Tap each set as you complete it; rest timer launches automatically',
    ],
    notes: [
      '"Lieutenant Dan, you got new legs!" — "Magic legs."',
      'Upper body push/pull split with an arms & core day',
      'Named after the greatest upper-body-only training philosophy in cinematic history',
    ],
  },
  {
    id: 'golf',
    name: 'Golf Performance',
    goal: 'Rotational power, hip/thoracic mobility, and single-leg stability for a consistent swing',
    daysPerWeek: 4,
    repRange: '6–12 reps / timed holds',
    rest: '60–90 seconds (use built-in rest timer)',
    equipment: 'specialty',
    interactive: true,
    days: [
      { dayNumber: 1, title: 'Mobility', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 2, title: 'Rotational Power', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 3, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 4, title: 'Stability', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 5, title: 'Rotational Power', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 6, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 7, title: 'Rest', isRest: true, exercises: [] },
    ],
    progressionRules: [
      'Lead with the hips on power days — never force lumbar twist',
      'Own single-leg balance before adding load on stability days',
      'Med ball optional — band chops work as a full substitute',
      'Tap each set as you complete it; rest timer launches automatically',
    ],
    notes: [
      'Built for golfers who want more distance and a quieter finish',
      'Mobility → Power → Stability cycle across the week',
      'Pairs well with range practice; keep heavy lifting off tournament mornings',
      'Use Workout Mode for set tracking, load logging, and rest timer',
    ],
  },
  {
    id: 'softball',
    name: 'Softball Performance',
    goal: 'Hitting/throwing power, throwing-arm longevity, and lower-body drive for base running',
    daysPerWeek: 4,
    repRange: '6–15 reps',
    rest: '60–90 seconds (use built-in rest timer)',
    equipment: 'specialty',
    interactive: true,
    days: [
      { dayNumber: 1, title: 'Power', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 2, title: 'Arm Care', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 3, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 4, title: 'Lower Drive', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 5, title: 'Power', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 6, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 7, title: 'Rest', isRest: true, exercises: [] },
    ],
    progressionRules: [
      'Arm Care days stay light — longevity over ego',
      'Explode on Power days; stick landings on laterals and step-ups',
      'Skip throwing volume the same day as heavy Power if the shoulder feels fried',
      'Tap each set as you complete it; rest timer launches automatically',
    ],
    notes: [
      'Built for hitters and fielders who want pop plus a healthy arm',
      'Power → Arm Care → Lower Drive across the week',
      'Band cuff work is non-negotiable during the season',
      'Use Workout Mode for set tracking, load logging, and rest timer',
    ],
  },
  {
    id: 'youth-sd',
    name: 'Youth Self-Defense',
    goal: 'MCMAP-adapted fundamentals: stance, break-falls, grab escapes, and pad strikes — escape and get safe',
    daysPerWeek: 4,
    repRange: 'Timed holds / 5–10 reps',
    rest: '45–60 seconds (use built-in rest timer)',
    equipment: 'specialty',
    interactive: true,
    days: [
      { dayNumber: 1, title: 'Stance & Movement', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 2, title: 'Break-Falls', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 3, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 4, title: 'Escapes from Grabs', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 5, title: 'Basic Strikes', isRest: false, exercises: [{ name: 'See workout mode', sets: '—', reps: '—' }] },
      { dayNumber: 6, title: 'Rest', isRest: true, exercises: [] },
      { dayNumber: 7, title: 'Rest', isRest: true, exercises: [] },
    ],
    progressionRules: [
      'Progress modules in order — stance before falls, falls before escapes, escapes before strikes',
      'Break-falls from knees/squat only — never from standing in this plan',
      'Every escape ends: clear space → create distance → yell/run',
      'Strikes are pad-only — strike then run, never a finishing move',
      'Tap each set as you complete it; rest timer launches automatically',
    ],
    notes: [
      'Requires adult/instructor supervision — not self-study',
      'No chokes, joint locks, eye strikes, or weapon techniques',
      'Goal is escape and get to a safe adult — not win the fight',
      'Use Workout Mode for set tracking and rest timer',
    ],
  },
];
