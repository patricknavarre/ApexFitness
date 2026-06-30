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
  'CORE + LEGS': { bg: '#3b1a00', accent: '#f97316', label: 'Core + Legs' },
  REST: { bg: '#1e293b', accent: '#475569', label: 'Rest' },
};

export const RECOVERY_SCHEDULE = [
  'PUSH',
  'PULL',
  'REST',
  'CORE + LEGS',
  'PUSH',
  'PULL',
  'REST',
] as const;

export const RECOVERY_EQUIPMENT = [
  'Adjustable bench',
  'Dumbbells',
  'Band cable column',
  'Resistance bands',
];

export const EQUIP_COLORS: Record<string, string> = {
  DB: '#3b82f6',
  'DB + bench': '#3b82f6',
  Band: '#10b981',
  'Band cable column': '#10b981',
  Bodyweight: '#64748b',
  'Bench leg roller': '#f97316',
};

export const recoveryWorkouts: Record<string, InteractiveWorkoutDay> = {
  PUSH: {
    phase: 'PUSH',
    warmup: '5 min: band pull-aparts, seated arm circles, shoulder CARs',
    caution:
      'All exercises seated or lying. Right foot may rest on floor — you are not standing.',
    sections: [
      {
        title: 'Chest',
        exercises: [
          {
            name: 'Incline DB Press',
            sets: 4,
            reps: '10–12',
            equip: 'DB + bench',
            note: 'Set bench to ~45°, back supported, full ROM',
          },
          {
            name: 'Flat DB Bench Press',
            sets: 4,
            reps: '10–12',
            equip: 'DB + bench',
            note: 'Lie flat, DBs at chest level, press to full extension — palms facing forward',
          },
          {
            name: 'Flat DB Fly',
            sets: 3,
            reps: '12–15',
            equip: 'DB + bench',
            note: 'Slight bend in elbows, stretch at bottom, squeeze at top',
          },
        ],
      },
      {
        title: 'Shoulders',
        exercises: [
          {
            name: 'Seated DB Shoulder Press',
            sets: 4,
            reps: '10–12',
            equip: 'DB + bench',
            note: 'Set bench upright, back fully supported, press overhead',
          },
          {
            name: 'Seated DB Lateral Raise',
            sets: 3,
            reps: '15',
            equip: 'DB',
            note: 'Slight forward lean, lead with elbows, slow eccentric',
          },
          {
            name: 'Seated DB Front Raise',
            sets: 3,
            reps: '12',
            equip: 'DB',
            note: 'Alternate arms, thumbs up, controlled descent',
          },
          {
            name: 'Band Lateral Raise (seated)',
            sets: 3,
            reps: '15 each',
            equip: 'Band',
            note: 'Sit on bench, band under left foot for right arm, then switch',
          },
        ],
      },
      {
        title: 'Triceps',
        exercises: [
          {
            name: 'Close-Grip DB Press',
            sets: 3,
            reps: '10–12',
            equip: 'DB + bench',
            note: 'Lie flat, DBs touching at center of chest, elbows tucked — tricep-focused press',
          },
          {
            name: 'Lying DB Tricep Extension',
            sets: 3,
            reps: '12',
            equip: 'DB + bench',
            note: 'Lie flat, DBs above chest, lower behind head by bending elbows only — elbows stationary',
          },
          {
            name: 'Seated Overhead DB Extension',
            sets: 3,
            reps: '12–15',
            equip: 'DB',
            note: 'Both hands on one DB, full stretch at bottom',
          },
          {
            name: 'Band Tricep Pushdown (seated)',
            sets: 3,
            reps: '15',
            equip: 'Band cable column',
            note: 'Sit facing column, anchor band high, elbows pinned at sides',
          },
        ],
      },
    ],
  },

  PULL: {
    phase: 'PULL',
    warmup: '5 min: band pull-aparts, scapular retractions, seated thoracic rotations',
    caution: 'All exercises seated or lying. No standing.',
    sections: [
      {
        title: 'Back',
        exercises: [
          {
            name: 'Prone Incline DB Row',
            sets: 4,
            reps: '10–12',
            equip: 'DB + bench',
            note: 'Set bench to ~30–45°, lie chest-down on the incline, row both DBs up — bench holds you completely, zero foot involvement',
          },
          {
            name: 'Single-Arm DB Row',
            sets: 4,
            reps: '10–12 each',
            equip: 'DB + bench',
            note: 'Brace knee and hand on bench, drive elbow back and up — right foot just rests, no pushing',
          },
          {
            name: 'Seated Band Row',
            sets: 3,
            reps: '15',
            equip: 'Band cable column',
            note: 'Sit facing column, band anchored at chest height, row both hands to sides — full scapular retraction',
          },
          {
            name: 'Band Straight-Arm Pulldown (seated)',
            sets: 3,
            reps: '15',
            equip: 'Band cable column',
            note: 'Sit facing column, band anchored high, arms straight, pull to thighs',
          },
        ],
      },
      {
        title: 'Rear Delts & Rotator Cuff',
        exercises: [
          {
            name: 'Incline DB Rear Delt Fly',
            sets: 3,
            reps: '15',
            equip: 'DB + bench',
            note: 'Lie chest-down on incline bench, arms wide, squeeze rear delts',
          },
          {
            name: 'Band Face Pull (seated)',
            sets: 3,
            reps: '20',
            equip: 'Band cable column',
            note: 'Sit facing column, band at eye level, pull to forehead, elbows high — shoulder health essential',
          },
          {
            name: 'Band External Rotation',
            sets: 3,
            reps: '15 each',
            equip: 'Band',
            note: 'Elbow at 90°, band anchored to side, slow rotation out',
          },
        ],
      },
      {
        title: 'Biceps',
        exercises: [
          {
            name: 'Seated DB Curl',
            sets: 4,
            reps: '10–12',
            equip: 'DB',
            note: 'Sit upright on bench, elbows at sides, full supination at top — no swinging',
          },
          {
            name: 'Seated Incline DB Curl',
            sets: 3,
            reps: '12',
            equip: 'DB + bench',
            note: 'Set bench to ~60°, lie back, arms hang — great stretch, eliminates cheating',
          },
          {
            name: 'Seated Hammer Curl',
            sets: 3,
            reps: '12–15',
            equip: 'DB',
            note: 'Neutral grip, can alternate, targets brachialis',
          },
          {
            name: 'Band Curl (seated)',
            sets: 3,
            reps: '15',
            equip: 'Band',
            note: 'Sit on bench, band under feet, curl both arms — constant tension',
          },
        ],
      },
    ],
  },

  'CORE + LEGS': {
    phase: 'CORE + LEGS',
    warmup: '5 min: seated hip circles, ankle pumps both feet, quad sets',
    caution:
      'All exercises seated or lying. Right leg reactivation only — no load. Left leg works hard.',
    sections: [
      {
        title: 'Right Leg Reactivation',
        tag: 'REACTIVATION',
        exercises: [
          {
            name: 'Quad Sets (isometric)',
            sets: 3,
            reps: '15 × 10-sec hold',
            equip: 'Bodyweight',
            note: 'Lie flat, tighten quad, press back of knee into floor. Right leg only.',
          },
          {
            name: 'Straight-Leg Raise',
            sets: 3,
            reps: '15',
            equip: 'Bodyweight',
            note: 'Lie flat, tighten quad first, raise right leg to ~45°. No pain.',
          },
          {
            name: 'Seated Terminal Knee Extension',
            sets: 3,
            reps: '15',
            equip: 'Band',
            note: 'Seated, band looped behind knee, extend to lockout. Light resistance.',
          },
          {
            name: 'Ankle Pumps + Circles',
            sets: 2,
            reps: '20 each direction',
            equip: 'Bodyweight',
            note: 'Seated. Keep circulation moving, fight atrophy below the knee.',
          },
        ],
      },
      {
        title: 'Left Leg — Full Work',
        exercises: [
          {
            name: 'Single-Leg DB Romanian Deadlift (LEFT)',
            sets: 4,
            reps: '10–12',
            equip: 'DB',
            note: 'Sit on edge of bench, hinge forward with DB in opposite hand, left leg extended — right foot rests lightly',
          },
          {
            name: 'Seated Single-Leg Extension (LEFT)',
            sets: 3,
            reps: '15',
            equip: 'Bench leg roller',
            note: 'Use the leg roller on your bench — right leg off, left leg only. Slow eccentric.',
          },
          {
            name: 'Seated Single-Leg Curl (LEFT)',
            sets: 3,
            reps: '15',
            equip: 'Bench leg roller',
            note: 'Flip to prone on bench, left leg only. Right leg hangs off side.',
          },
          {
            name: 'Single-Leg Calf Raise (LEFT, seated)',
            sets: 3,
            reps: '20',
            equip: 'DB + bench',
            note: 'DB on left knee, right foot completely off floor',
          },
          {
            name: 'Band Hip Abduction (seated)',
            sets: 3,
            reps: '20',
            equip: 'Band',
            note: 'Band around both knees, seated, push knees apart against resistance — glute med work',
          },
        ],
      },
      {
        title: 'Core',
        exercises: [
          {
            name: 'DB Rollout (from knees)',
            sets: 3,
            reps: '10',
            equip: 'DB',
            note: 'Kneel on mat, hands on two DBs (hex work best), roll forward slowly, pull back. Right knee can rest.',
          },
          {
            name: 'Lying Leg Raise',
            sets: 3,
            reps: '15',
            equip: 'Bodyweight',
            note: 'Flat on bench or floor — right leg passive, left drives',
          },
          {
            name: 'Dead Bug',
            sets: 3,
            reps: '10 each side',
            equip: 'Bodyweight',
            note: 'Lie on back, opposite arm and leg extend. Press lower back into floor the whole time.',
          },
          {
            name: 'Seated Russian Twist',
            sets: 3,
            reps: '20',
            equip: 'DB',
            note: 'Lean back slightly, feet up or resting, rotate side to side with DB',
          },
          {
            name: 'Band Pallof Press (seated)',
            sets: 3,
            reps: '12 each side',
            equip: 'Band cable column',
            note: 'Sit perpendicular to column, press band straight out and hold — anti-rotation',
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
