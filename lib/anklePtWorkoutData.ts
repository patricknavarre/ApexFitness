import type {
  InteractiveExercise,
  InteractiveSection,
  InteractiveWorkoutDay,
  PhaseColor,
} from './recoveryWorkoutData';

export const ANKLE_PT_PHASE_COLOR: Record<string, PhaseColor> = {
  STRENGTH: { bg: '#2A3318', accent: '#C4A35A', label: 'Ankle Strength' },
  BALANCE: { bg: '#3D4A1F', accent: '#D2B48C', label: 'Balance & Proprioception' },
  MOBILITY: { bg: '#2A3318', accent: '#8B7355', label: 'Mobility & Bike' },
  REST: { bg: '#161a10', accent: '#8B7355', label: 'Rest' },
};

export const ANKLE_PT_SCHEDULE = [
  'STRENGTH',
  'BALANCE',
  'REST',
  'STRENGTH',
  'MOBILITY',
  'REST',
  'REST',
] as const;

export const ANKLE_PT_EQUIPMENT = [
  'Stationary bike or outdoor bike',
  'Resistance bands (light–medium)',
  'Wall or rack for support',
  'Hand towel',
  'Balance pad',
  'Step or curb (heel raises)',
  'Floor tape or markers (9-box grid)',
  'Foam pad or folded towel (optional)',
];

/** PT home program — do every day (from clinic handout). */
const DAILY_HOME_PT_EXERCISES: InteractiveExercise[] = [
  {
    name: 'Toe Crunches with hand towel',
    sets: 1,
    reps: '2–3 min',
    equip: 'Hand towel',
    note: 'Barefoot if allowed: scrunch the towel toward you with your toes.',
  },
  {
    name: 'Calf Stretching',
    sets: 1,
    reps: 'with + without knee bend',
    equip: 'Bodyweight',
    note: 'Straight knee and bent knee — both sides. Gentle only; no sharp pinch.',
  },
  {
    name: 'Balance Pad — Tandem Standing',
    sets: 1,
    reps: 'one foot in front',
    equip: 'Balance pad',
    note: 'Stand on the pad with one foot directly in front of the other. Use a wall if needed.',
  },
  {
    name: 'Balance Pad — Single-Leg Stance',
    sets: 1,
    reps: 'each side',
    equip: 'Balance pad',
    note: 'One-leg stand on the pad. Soft knee; stay near support.',
  },
  {
    name: 'Walk with Straight Feet',
    sets: 1,
    reps: 'along floorboard line',
    equip: 'Bodyweight',
    note: 'Toe and heel land on a straight floorboard line. Slow, controlled steps.',
  },
  {
    name: 'Elvis Presley Dance',
    sets: 1,
    reps: 'side to side',
    equip: 'Bodyweight',
    note: 'Side to side — heel up, then toes up. Smooth weight shift.',
  },
];

const DAILY_HOME_PT_SECTION: InteractiveSection = {
  title: 'Daily Home PT',
  tag: 'Daily',
  exercises: DAILY_HOME_PT_EXERCISES,
};

/** Clinic intermediate drills (handout 1). */
const INTERMEDIATE_ANKLE_EXERCISES: InteractiveExercise[] = [
  {
    name: '1-inch Jumps',
    sets: 1,
    reps: '20',
    equip: 'Bodyweight',
    note: 'Small hop height (~1 in). Land on both forefeet. Soft knees.',
  },
  {
    name: '9-Box Jump',
    sets: 1,
    reps: '5',
    equip: 'Floor tape',
    note: 'Tape a 3×3 grid. Start center. Hop to each box with one foot (all nine positions).',
  },
  {
    name: 'Ankle Stretch Wobble',
    sets: 1,
    reps: '20/side',
    equip: 'Bodyweight',
    note: 'Toes only on opposite foot. Shift weight in a circle around the foot edge — CW then CCW. Both ankles.',
  },
  {
    name: 'Balance Pad Weight Circles',
    sets: 1,
    reps: '20/side',
    equip: 'Balance pad',
    note: 'Single-leg on pad. Shift weight in a circle clockwise then counter-clockwise. Both sides.',
  },
  {
    name: 'Single-Leg Heel Raises',
    sets: 1,
    reps: '20/side',
    equip: 'Bodyweight',
    note: 'Slow tempo. Use wall for balance. Match both sides.',
  },
];

const INTERMEDIATE_ANKLE_SECTION: InteractiveSection = {
  title: 'Intermediate Ankle Drills',
  tag: 'Clinic',
  exercises: INTERMEDIATE_ANKLE_EXERCISES,
};

/** Clinic advanced exercises (handout 2). */
const ADVANCED_ANKLE_EXERCISES: InteractiveExercise[] = [
  {
    name: 'Heel Raises at Step',
    sets: 2,
    reps: '10',
    equip: 'Step',
    note: 'Stand on step edge; full ROM up and controlled lower. Hold rail if needed.',
  },
  {
    name: 'Single-Leg Calf Raise (Eyes Closed)',
    sets: 2,
    reps: '10/side',
    equip: 'Bodyweight',
    note: 'Wall nearby for safety. Only if eyes-open single-leg raises are solid.',
  },
  {
    name: 'Single-Leg Stand — Leg Swing',
    sets: 2,
    reps: '10 forward + 10 back/side',
    equip: 'Bodyweight',
    note: 'Stand on one leg; swing free leg forward then backward. Control the swing.',
  },
  {
    name: 'Side Hop with 2 sec Hold',
    sets: 2,
    reps: '8/side',
    equip: 'Bodyweight',
    note: 'Small lateral hop. Stick the landing and hold 2 seconds before next rep.',
  },
  {
    name: 'Squats with Heel Raises',
    sets: 2,
    reps: '10',
    equip: 'Bodyweight',
    note: 'Bodyweight squat; rise onto toes at the top of each rep.',
  },
];

const ADVANCED_ANKLE_SECTION: InteractiveSection = {
  title: 'Advanced Ankle Exercises',
  tag: 'Clinic',
  exercises: ADVANCED_ANKLE_EXERCISES,
};

function withClinicSections(sections: InteractiveSection[]): InteractiveSection[] {
  return [
    ...sections,
    INTERMEDIATE_ANKLE_SECTION,
    ADVANCED_ANKLE_SECTION,
    DAILY_HOME_PT_SECTION,
  ];
}

export const anklePtWorkouts: Record<string, InteractiveWorkoutDay> = {
  STRENGTH: {
    phase: 'STRENGTH',
    warmup:
      '3–5 min: ankle pumps, ankle circles both directions, gentle towel stretch for calves',
    caution:
      'Post-boot strength day — ankle isolation only, minimal leg loading. Pain ≤3/10 is OK; sharp pain, swelling jump, or next-day limp means scale back. Match both sides. Jumps/hops only if pain stays ≤3/10 — skip advanced hops if swelling rises.',
    sections: withClinicSections([
      {
        title: 'Isolated Ankle Strength',
        tag: 'PT',
        exercises: [
          {
            name: 'Band Dorsiflexion',
            sets: 3,
            reps: '12–15/side',
            equip: 'Band',
            note: 'Band around top of foot, pull toes toward shin against resistance',
          },
          {
            name: 'Band Plantarflexion',
            sets: 3,
            reps: '12–15/side',
            equip: 'Band',
            note: 'Point toes away against band — slow return',
          },
          {
            name: 'Band Inversion',
            sets: 3,
            reps: '12–15/side',
            equip: 'Band',
            note: 'Turn sole inward against band without rotating the whole leg',
          },
          {
            name: 'Band Eversion',
            sets: 3,
            reps: '12–15/side',
            equip: 'Band',
            note: 'Turn sole outward against band — key for lateral ankle stability',
          },
        ],
      },
      {
        title: 'Light Ankle Loading',
        exercises: [
          {
            name: 'Seated Tibialis Raise',
            sets: 2,
            reps: '12–15',
            equip: 'Bodyweight',
            note: 'Heels down, lift toes. Keep it easy — add a light plate only when bodyweight is trivial',
          },
          {
            name: 'Double-Leg Calf Raise',
            sets: 2,
            reps: '10–12',
            equip: 'Bodyweight',
            note: 'Light only — flat ground, no step needed. Slow tempo; skip if ankle feels irritated',
          },
        ],
      },
    ]),
  },

  BALANCE: {
    phase: 'BALANCE',
    warmup: '3 min: ankle alphabet (write A–Z with big toe)',
    caution:
      'Proprioception rebuilds what the boot took away. Stay near a wall. Quality over duration — stop before form falls apart. Jumps/hops only if pain ≤3/10 and no next-day limp — skip advanced hops if swelling rises.',
    sections: withClinicSections([
      {
        title: 'Static Balance',
        tag: 'PT',
        exercises: [
          {
            name: 'Single-Leg Balance (eyes open)',
            sets: 3,
            reps: '30–45 sec/side',
            equip: 'Balance',
            note: 'Soft knee; hips level. Progress time before closing eyes',
          },
          {
            name: 'Single-Leg Balance (eyes closed)',
            sets: 3,
            reps: '15–30 sec/side',
            equip: 'Balance',
            note: 'Only if eyes-open is solid. Fingertip on wall OK',
          },
          {
            name: 'Single-Leg Balance on Soft Surface',
            sets: 3,
            reps: '20–40 sec/side',
            equip: 'Balance',
            note: 'Foam pad, folded towel, or Bosu. Eyes open first',
          },
        ],
      },
      {
        title: 'Light Proprioception',
        exercises: [
          {
            name: 'Heel-to-Toe Walk',
            sets: 2,
            reps: '15–20 steps',
            equip: 'Bodyweight',
            note: 'Straight line; slow and controlled. Turn and walk back',
          },
          {
            name: 'Star Excursion Reach (supported)',
            sets: 2,
            reps: '5 reaches × 3 directions/side',
            equip: 'Balance',
            note: 'Stand on one leg; lightly touch toes forward, side, back. Hold rack',
          },
        ],
      },
    ]),
  },

  MOBILITY: {
    phase: 'MOBILITY',
    warmup: '2–3 min easy stationary bike to warm the ankle',
    caution:
      'Mobility + easy bike endurance. PT guidance: bike instead of running. No forcing end-range. Mild stretch is good; pinching or sharp pain is not.',
    sections: withClinicSections([
      {
        title: 'Ankle Mobility',
        tag: 'PT',
        exercises: [
          {
            name: 'Knee-to-Wall Ankle Mobilization',
            sets: 3,
            reps: '10/side',
            equip: 'Bodyweight',
            note: 'Front foot near wall; drive knee toward wall keeping heel down. Move foot back as ROM improves',
          },
          {
            name: 'Ankle Circles + Alphabet',
            sets: 2,
            reps: '10 circles + A–Z/side',
            equip: 'Bodyweight',
            note: 'Seated or lying. Big, smooth letters with the big toe',
          },
          {
            name: 'Towel Calf Stretch (gastroc + soleus)',
            sets: 2,
            reps: '30–45 sec each (knee straight + bent)',
            equip: 'Bodyweight',
            note: 'Straight knee hits gastroc; bent knee hits soleus. Gentle pull only',
          },
          {
            name: 'Towel Scrunches / Marble Pickups',
            sets: 2,
            reps: '10–15',
            equip: 'Bodyweight',
            note: 'Barefoot if allowed: scrunch towel toward you or pick up small objects with toes',
          },
        ],
      },
      {
        title: 'Light Endurance — Bike',
        exercises: [
          {
            name: 'Seated Band Ankle 4-Way Circuit',
            sets: 2,
            reps: '10 each direction/side',
            equip: 'Band',
            note: 'DF → PF → INV → EV with minimal rest between directions',
          },
          {
            name: 'Stationary Bike (easy)',
            sets: 1,
            reps: '10–15 min',
            equip: 'Bike',
            note: 'Easy resistance, smooth cadence. Seat high enough for soft knee at bottom. Stop if swelling rises — no running',
          },
        ],
      },
    ]),
  },

  REST: {
    phase: 'REST',
    warmup: 'None required — this is your daily home PT only',
    caution:
      'Clinic home program. Pain ≤3/10 is OK; stop for sharp pain, swelling jump, or next-day limp. Near a wall for balance pad work.',
    sections: [DAILY_HOME_PT_SECTION],
  },
};

export function getAnklePtWorkoutForDay(dayNumber: number): InteractiveWorkoutDay | null {
  const phase = ANKLE_PT_SCHEDULE[(dayNumber - 1) % ANKLE_PT_SCHEDULE.length];
  return anklePtWorkouts[phase] ?? null;
}
