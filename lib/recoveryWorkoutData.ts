export type InteractiveExercise = {
  name: string;
  sets: number;
  reps: string;
  equip: string;
  note?: string;
};

export type InteractiveSection = {
  title: string;
  tag?: string;
  exercises: InteractiveExercise[];
};

export type InteractiveWorkoutDay = {
  phase: string;
  warmup?: string;
  caution?: string;
  sections: InteractiveSection[];
};

export type PhaseColor = {
  bg: string;
  accent: string;
  label: string;
};

export const PHASE_COLOR: Record<string, PhaseColor> = {
  PUSH: { bg: '#1e3a5f', accent: '#3b82f6', label: 'Push Day' },
  PULL: { bg: '#1a3a2a', accent: '#10b981', label: 'Pull Day' },
  'LOWER + ANKLE': { bg: '#3b1a00', accent: '#f97316', label: 'Lower + Ankle' },
  REST: { bg: '#1e293b', accent: '#475569', label: 'Rest' },
};

export const RECOVERY_SCHEDULE = [
  'PUSH',
  'PULL',
  'LOWER + ANKLE',
  'REST',
  'PUSH',
  'PULL',
  'REST',
] as const;

export const RECOVERY_EQUIPMENT = [
  'Barbell + rack',
  'Dumbbells',
  'Cable stack',
  'Leg press / machines',
  'Resistance bands',
  'Calf raise machine or step',
];

export const EQUIP_COLORS: Record<string, string> = {
  DB: '#3b82f6',
  'DB + bench': '#3b82f6',
  BB: '#6366f1',
  Cable: '#8b5cf6',
  Machine: '#0ea5e9',
  Band: '#10b981',
  'Band cable column': '#10b981',
  Bodyweight: '#64748b',
  Step: '#f97316',
  Balance: '#eab308',
  Bike: '#06b6d4',
  'Bench leg roller': '#f97316',
  'Med ball': '#ef4444',
};

export const recoveryWorkouts: Record<string, InteractiveWorkoutDay> = {
  PUSH: {
    phase: 'PUSH',
    warmup: '5 min: band pull-aparts, arm circles, light cable chest press',
    caution:
      'Standing is allowed. Keep loads moderate — control every rep. Stop any movement that causes sharp ankle pain.',
    sections: [
      {
        title: 'Chest',
        exercises: [
          {
            name: 'Flat Barbell or DB Bench Press',
            sets: 4,
            reps: '8–12',
            equip: 'BB',
            note: 'Feet planted softly — don’t drive hard through the recovering ankle yet',
          },
          {
            name: 'Incline DB Press',
            sets: 3,
            reps: '10–12',
            equip: 'DB + bench',
            note: 'Bench ~30–45°, full ROM, controlled eccentric',
          },
          {
            name: 'Cable Chest Fly',
            sets: 3,
            reps: '12–15',
            equip: 'Cable',
            note: 'Slight bend in elbows; squeeze at midline',
          },
        ],
      },
      {
        title: 'Shoulders',
        exercises: [
          {
            name: 'Seated DB Shoulder Press',
            sets: 3,
            reps: '8–12',
            equip: 'DB + bench',
            note: 'Back supported; press overhead without arching hard',
          },
          {
            name: 'Cable Lateral Raise',
            sets: 3,
            reps: '12–15',
            equip: 'Cable',
            note: 'Lead with elbows; pause at top',
          },
          {
            name: 'Cable Face Pull',
            sets: 3,
            reps: '15–20',
            equip: 'Cable',
            note: 'Rope to eye level; external rotation at finish',
          },
        ],
      },
      {
        title: 'Triceps',
        exercises: [
          {
            name: 'Cable Tricep Pushdown',
            sets: 3,
            reps: '12–15',
            equip: 'Cable',
            note: 'Elbows pinned; full extension without shrugging',
          },
          {
            name: 'Overhead Cable Tricep Extension',
            sets: 3,
            reps: '12–15',
            equip: 'Cable',
            note: 'Soft elbows at the stretch; don’t lock out aggressively',
          },
        ],
      },
    ],
  },

  PULL: {
    phase: 'PULL',
    warmup: '5 min: band pull-aparts, scapular retractions, light lat pulldown',
    caution:
      'Standing rows and machine work are fine. Brace the core; avoid heavy axial load that forces you to grind through the ankle.',
    sections: [
      {
        title: 'Back',
        exercises: [
          {
            name: 'Lat Pulldown',
            sets: 4,
            reps: '8–12',
            equip: 'Machine',
            note: 'Pull to upper chest; control the stretch at the top',
          },
          {
            name: 'Seated Cable Row',
            sets: 4,
            reps: '8–12',
            equip: 'Cable',
            note: 'Chest tall, full scapular retraction — no torso swinging',
          },
          {
            name: 'Single-Arm DB Row',
            sets: 3,
            reps: '10–12 each',
            equip: 'DB + bench',
            note: 'Knee and hand on bench; drive elbow back',
          },
          {
            name: 'Straight-Arm Cable Pulldown',
            sets: 3,
            reps: '12–15',
            equip: 'Cable',
            note: 'Slight hinge; arms straight; pull to thighs',
          },
        ],
      },
      {
        title: 'Rear Delts & Arms',
        exercises: [
          {
            name: 'Cable Face Pull',
            sets: 3,
            reps: '15–20',
            equip: 'Cable',
            note: 'Elbows high; squeeze rear delts',
          },
          {
            name: 'DB Curl',
            sets: 3,
            reps: '10–12',
            equip: 'DB',
            note: 'Full supination at top; no swinging',
          },
          {
            name: 'Hammer Curl',
            sets: 3,
            reps: '12–15',
            equip: 'DB',
            note: 'Neutral grip; controlled tempo',
          },
        ],
      },
    ],
  },

  'LOWER + ANKLE': {
    phase: 'LOWER + ANKLE',
    warmup:
      '5–8 min: ankle pumps + circles, band dorsiflexion/plantarflexion, bodyweight sit-to-stand, short easy walk on treadmill',
    caution:
      'Post-boot day. Prefer machines and supported single-leg work first. Progress load only if pain stays ≤3/10 during and after. Skip jumping and cutting.',
    sections: [
      {
        title: 'Lower Body — Rebuild',
        exercises: [
          {
            name: 'Leg Press (bilateral)',
            sets: 4,
            reps: '10–12',
            equip: 'Machine',
            note: 'Feet mid-platform; even pressure. Stop before depth irritates the ankle',
          },
          {
            name: 'Goblet Squat (to box if needed)',
            sets: 3,
            reps: '8–12',
            equip: 'DB',
            note: 'Controlled sit; heels stay grounded. Use a box for confidence early on',
          },
          {
            name: 'Romanian Deadlift (light–moderate)',
            sets: 3,
            reps: '8–12',
            equip: 'BB',
            note: 'Soft knees, hinge at hips. Start light — prioritize balance and brace',
          },
          {
            name: 'Seated Leg Curl',
            sets: 3,
            reps: '12–15',
            equip: 'Machine',
            note: 'Slow eccentric; no hip hiking',
          },
          {
            name: 'Leg Extension',
            sets: 2,
            reps: '12–15',
            equip: 'Machine',
            note: 'Full lockout squeeze; pain-free range only',
          },
          {
            name: 'Supported Split Squat',
            sets: 3,
            reps: '8–10/leg',
            equip: 'DB',
            note: 'Hold rack or wall. Shorter stance if ankle feels tight. Equal work both sides',
          },
        ],
      },
      {
        title: 'Ankle Strength Finisher',
        tag: 'PT',
        exercises: [
          {
            name: 'Band Ankle 4-Way (DF / PF / INV / EV)',
            sets: 2,
            reps: '12 each direction/side',
            equip: 'Band',
            note: 'Slow, isolated ankle motion. Matching volume on both ankles',
          },
          {
            name: 'Double-Leg Calf Raise',
            sets: 3,
            reps: '12–15',
            equip: 'Step',
            note: 'Full stretch on step if comfortable; pause at top. Progress to single-leg later',
          },
          {
            name: 'Seated Tibialis Raise',
            sets: 3,
            reps: '15–20',
            equip: 'Bodyweight',
            note: 'Heels planted, lift toes toward shins — builds anterior shin strength',
          },
          {
            name: 'Single-Leg Balance',
            sets: 3,
            reps: '30–45 sec/side',
            equip: 'Balance',
            note: 'Near a wall. Eyes open first; progress to soft surface when steady',
          },
        ],
      },
    ],
  },
};

export function getRecoveryWorkoutForDay(dayNumber: number): InteractiveWorkoutDay | null {
  const phase = RECOVERY_SCHEDULE[(dayNumber - 1) % RECOVERY_SCHEDULE.length];
  if (phase === 'REST') return null;
  return recoveryWorkouts[phase] ?? null;
}
