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
  days: WorkoutDay[];
  progressionRules?: string[];
  nutritionReminders?: string[];
  notes?: string[];
};

export const WORKOUT_PLANS: WorkoutPlan[] = [
  {
    id: '5-day-muscle',
    name: '5-Day Muscle Building',
    goal: 'Maximum muscle growth',
    daysPerWeek: 5,
    repRange: '8–15 reps',
    rest: '60–90 seconds between sets',
    days: [
      {
        dayNumber: 1,
        title: 'Upper Push',
        isRest: false,
        exercises: [
          { name: 'Flat Bench Press (DB/BB)', sets: '3-4', reps: '8-12' },
          { name: 'Incline DB Press', sets: '3', reps: '10-12' },
          { name: 'Overhead DB Press', sets: '3', reps: '10-12' },
          { name: 'Band Lateral Raises', sets: '3', reps: '12-15' },
          { name: 'Band Tricep Pushdowns', sets: '3', reps: '12-15' },
          { name: 'Band Chest Flyes', sets: '2-3', reps: '12-15' },
        ],
      },
      {
        dayNumber: 2,
        title: 'Lower Body',
        isRest: false,
        exercises: [
          { name: 'DB Romanian Deadlifts', sets: '3-4', reps: '10-12' },
          { name: 'DB Goblet Squats / Split Squats', sets: '3-4', reps: '10-12' },
          { name: 'Leg Curls', sets: '3-4', reps: '10-15' },
          { name: 'DB Walking Lunges', sets: '3', reps: '12 steps/leg' },
          { name: 'Standing Calf Raises', sets: '4', reps: '12-20' },
        ],
      },
      {
        dayNumber: 3,
        title: 'Upper Pull',
        isRest: false,
        exercises: [
          { name: 'DB Rows', sets: '4', reps: '8-12/arm' },
          { name: 'Band Face Pulls', sets: '3', reps: '15-20' },
          { name: 'DB Pullovers', sets: '3', reps: '10-12' },
          { name: 'Band Lat Pulldowns', sets: '3', reps: '12-15' },
          { name: 'DB Shrugs', sets: '3', reps: '12-15' },
          { name: 'DB Bicep Curls', sets: '3', reps: '10-12' },
        ],
      },
      { dayNumber: 4, title: 'Rest', isRest: true, exercises: [] },
      {
        dayNumber: 5,
        title: 'Lower Body (Volume)',
        isRest: false,
        exercises: [
          { name: 'Bulgarian Split Squats', sets: '3', reps: '10-12/leg' },
          { name: 'DB Step-Ups', sets: '3', reps: '12/leg' },
          { name: 'Leg Curls', sets: '3-4', reps: '12-15' },
          { name: 'DB Stiff-Leg Deadlifts', sets: '3', reps: '10-12' },
          { name: 'Goblet Squat (pause)', sets: '3', reps: '12-15' },
          { name: 'Seated Calf Raises', sets: '3', reps: '15-20' },
        ],
      },
      {
        dayNumber: 6,
        title: 'Arms & Shoulders',
        isRest: false,
        exercises: [
          { name: 'Close-Grip DB Press', sets: '3', reps: '10-12' },
          { name: 'DB Overhead Extension', sets: '3', reps: '12-15' },
          { name: 'Band Tricep Kickbacks', sets: '2', reps: '15' },
          { name: 'Incline DB Curls', sets: '3', reps: '10-12' },
          { name: 'Hammer Curls', sets: '3', reps: '10-12' },
          { name: 'Band Curls', sets: '2', reps: '15-20' },
          { name: 'DB Lateral Raises', sets: '3', reps: '12-15' },
        ],
      },
      { dayNumber: 7, title: 'Rest', isRest: true, exercises: [] },
    ],
    progressionRules: [
      'Add reps each week within the range',
      'When you hit top of range for all sets, increase weight 5–10 lbs',
      'Train within 2–3 reps of failure',
      'Deload every 6 weeks (reduce volume 50%)',
    ],
    nutritionReminders: [
      'Protein: 0.8–1g per lb bodyweight',
      'Calorie surplus: +200–400 daily',
      'Creatine: 5g daily',
      'Sleep: 7–9 hours',
    ],
    notes: [
      'Can split any day into 2 sessions (morning/evening)',
      'Avoid heavy loads due to hernia history',
      'Focus on controlled form, not max weight',
    ],
  },
  {
    id: '3-day-full-body',
    name: '3-Day Full Body',
    goal: 'Build strength and muscle with minimal days',
    daysPerWeek: 3,
    repRange: '8–12 reps',
    rest: '90–120 seconds',
    days: [
      {
        dayNumber: 1,
        title: 'Full Body A',
        isRest: false,
        exercises: [
          { name: 'Goblet Squat', sets: '3', reps: '10-12' },
          { name: 'Push-ups or DB Bench', sets: '3', reps: '8-12' },
          { name: 'DB or Band Row', sets: '3', reps: '10-12' },
          { name: 'Romanian Deadlift', sets: '3', reps: '10-12' },
          { name: 'Overhead Press', sets: '2', reps: '10-12' },
          { name: 'Plank', sets: '2', reps: '30-45 sec' },
        ],
      },
      { dayNumber: 2, title: 'Rest', isRest: true, exercises: [] },
      {
        dayNumber: 3,
        title: 'Full Body B',
        isRest: false,
        exercises: [
          { name: 'Split Squat or Lunge', sets: '3', reps: '10/leg' },
          { name: 'Incline DB Press', sets: '3', reps: '10-12' },
          { name: 'Lat Pulldown or Pull-ups', sets: '3', reps: '8-12' },
          { name: 'Leg Curl', sets: '2', reps: '12-15' },
          { name: 'DB Curls', sets: '2', reps: '10-12' },
          { name: 'Tricep Pushdown', sets: '2', reps: '12-15' },
        ],
      },
      { dayNumber: 4, title: 'Rest', isRest: true, exercises: [] },
      {
        dayNumber: 5,
        title: 'Full Body C',
        isRest: false,
        exercises: [
          { name: 'Goblet or Back Squat', sets: '3', reps: '8-10' },
          { name: 'Bench or Push-up', sets: '3', reps: '8-12' },
          { name: 'Row', sets: '3', reps: '10-12' },
          { name: 'Hip Thrust or Glute Bridge', sets: '3', reps: '12-15' },
          { name: 'Lateral Raises', sets: '2', reps: '12-15' },
          { name: 'Dead Bug or Hollow Hold', sets: '2', reps: '30 sec' },
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
  },
  {
    id: '4-day-upper-lower',
    name: '4-Day Upper/Lower',
    goal: 'Balanced hypertrophy and strength',
    daysPerWeek: 4,
    repRange: '6–12 reps (compound), 10–15 (isolation)',
    rest: '60–90 seconds',
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
          { name: 'Squat', sets: '4', reps: '6-10' },
          { name: 'Romanian Deadlift', sets: '3', reps: '8-10' },
          { name: 'Leg Press', sets: '3', reps: '10-12' },
          { name: 'Leg Curl', sets: '3', reps: '10-12' },
          { name: 'Calf Raises', sets: '3', reps: '15-20' },
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
];
