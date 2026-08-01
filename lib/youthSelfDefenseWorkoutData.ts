import type { InteractiveWorkoutDay, PhaseColor } from './recoveryWorkoutData';

/** Marine-inspired OD / tan phase colors for InteractiveWorkout headers */
export const YOUTH_SD_PHASE_COLOR: Record<string, PhaseColor> = {
  STANCE: { bg: '#2A3318', accent: '#C4A35A', label: 'Stance & Movement' },
  'BREAK-FALLS': { bg: '#3D4A1F', accent: '#D2B48C', label: 'Break-Falls' },
  ESCAPES: { bg: '#2A3318', accent: '#8B7355', label: 'Escapes' },
  STRIKES: { bg: '#3D4A1F', accent: '#C4A35A', label: 'Basic Strikes' },
};

export const YOUTH_SD_EQUIPMENT = [
  'Soft mat or carpeted floor (required for break-falls)',
  'Strike pad, pillow, or heavy bag (for strikes)',
  'Open space for footwork',
];

const SUPERVISION_CAUTION =
  'Adult/instructor supervision required — not self-study. No chokes, joint locks, eye strikes, or weapons. Goal is escape and get to a safe adult — never "win the fight."';

export const youthSelfDefenseWorkouts: Record<string, InteractiveWorkoutDay> = {
  STANCE: {
    phase: 'STANCE',
    warmup: '3–4 min: easy march in place, arm circles, gentle neck turns (slow)',
    caution: SUPERVISION_CAUTION,
    sections: [
      {
        title: 'Ready Stance',
        tag: 'Module 1',
        exercises: [
          {
            name: 'Ready Stance Hold',
            sets: 3,
            reps: '30 sec',
            equip: 'Bodyweight',
            note: 'Feet shoulder-width, hands up, chin down. Stay soft in the knees — ready, not stiff',
          },
        ],
      },
      {
        title: 'Footwork',
        exercises: [
          {
            name: '45° Step Drill',
            sets: 3,
            reps: '8 each direction',
            equip: 'Bodyweight',
            note: 'Forward, back, left, right at 45°. Never cross the legs — stay balanced',
          },
          {
            name: 'Stance Reset After Steps',
            sets: 2,
            reps: '8 resets',
            equip: 'Bodyweight',
            note: 'Step once, plant, return to ready stance. Comfortable footwork is the goal',
          },
        ],
      },
    ],
  },

  'BREAK-FALLS': {
    phase: 'BREAK-FALLS',
    warmup: '3 min: shoulder rolls, hip rocks on all fours, practice slap-the-mat from a seated position',
    caution: `${SUPERVISION_CAUTION} Mats preferred. Break-falls from knees or squat only — never from standing in this plan.`,
    sections: [
      {
        title: 'Safe Falling',
        tag: 'Module 2',
        exercises: [
          {
            name: 'Front Break-Fall (kneeling)',
            sets: 1,
            reps: '5',
            equip: 'Mat',
            note: 'From knees only. Slap the mat with both hands, chin tucked. Build confidence without fear',
          },
          {
            name: 'Back Break-Fall (squat)',
            sets: 1,
            reps: '5',
            equip: 'Mat',
            note: 'From squat only. Chin tucked, slap out to the sides — protect the head',
          },
          {
            name: 'Side Break-Fall (kneeling)',
            sets: 1,
            reps: '5 each side',
            equip: 'Mat',
            note: 'From knees only. Fall to the side, slap with the bottom arm. Match both sides',
          },
        ],
      },
    ],
  },

  ESCAPES: {
    phase: 'ESCAPES',
    warmup: '3–4 min: ready stance holds + 45° steps to wake up footwork from Module 1',
    caution: `${SUPERVISION_CAUTION} Partner optional — solo shadow reps OK. Every escape ends the same: clear space → create distance → yell/run.`,
    sections: [
      {
        title: 'Grab Escapes',
        tag: 'Module 3',
        exercises: [
          {
            name: 'Wrist Grab Escape',
            sets: 1,
            reps: '5 each side',
            equip: 'Bodyweight',
            note: 'Break the grip at the thumb gap. Then: clear space → create distance → yell/run',
          },
          {
            name: 'Rear Bear Hug Escape',
            sets: 1,
            reps: '5',
            equip: 'Bodyweight',
            note: 'Drop weight, create space, turn out. Then: clear space → create distance → yell/run',
          },
          {
            name: 'Front Bear Hug Escape',
            sets: 1,
            reps: '5',
            equip: 'Bodyweight',
            note: 'Frame, drop base, create an angle out. Then: clear space → create distance → yell/run',
          },
          {
            name: 'Rear Headlock Escape (turtle-and-turn)',
            sets: 1,
            reps: '5',
            equip: 'Bodyweight',
            note: 'Turtle posture and turn — no choke practice. Then: clear space → create distance → yell/run',
          },
        ],
      },
    ],
  },

  STRIKES: {
    phase: 'STRIKES',
    warmup: '4 min: ready stance, light shadow palm-heels in the air (no power), easy knee lifts',
    caution: `${SUPERVISION_CAUTION} Pad/target only — no live contact or sparring. Always paired with "strike then run" — never taught as a finishing move.`,
    sections: [
      {
        title: 'Pad Strikes',
        tag: 'Module 4',
        exercises: [
          {
            name: 'Palm Heel Strike (pad)',
            sets: 3,
            reps: '10',
            equip: 'Pad',
            note: 'Strike the pad, then reset to ready and step back — strike then run',
          },
          {
            name: 'Hammer Fist (pad)',
            sets: 3,
            reps: '10',
            equip: 'Pad',
            note: 'Top of the fist to the pad. Strike then run — create distance after',
          },
          {
            name: 'Knee Strike (pad)',
            sets: 3,
            reps: '10 each side',
            equip: 'Pad',
            note: 'Drive the knee into the pad, hands up. Strike then run',
          },
          {
            name: 'Front Kick (pad)',
            sets: 3,
            reps: '10 each side',
            equip: 'Pad',
            note: 'Push-kick to the pad, land in ready stance. Strike then run',
          },
        ],
      },
    ],
  },
};

export type YouthSdModule = {
  id: string;
  number: number;
  title: string;
  phase: string;
  summary: string;
  workout: InteractiveWorkoutDay;
};

export const YOUTH_SD_MODULES: YouthSdModule[] = [
  {
    id: 'stance',
    number: 1,
    title: 'Stance & Movement',
    phase: 'STANCE',
    summary: 'Ready stance holds and 45° footwork without crossing the legs.',
    workout: youthSelfDefenseWorkouts.STANCE,
  },
  {
    id: 'break-falls',
    number: 2,
    title: 'Break-Falls',
    phase: 'BREAK-FALLS',
    summary: 'Front, back, and side break-falls from knees or squat only.',
    workout: youthSelfDefenseWorkouts['BREAK-FALLS'],
  },
  {
    id: 'escapes',
    number: 3,
    title: 'Escapes from Grabs',
    phase: 'ESCAPES',
    summary: 'Wrist, bear hug, and headlock escapes — then clear, distance, yell/run.',
    workout: youthSelfDefenseWorkouts.ESCAPES,
  },
  {
    id: 'strikes',
    number: 4,
    title: 'Basic Strikes',
    phase: 'STRIKES',
    summary: 'Palm heel, hammer fist, knee, and front kick to pad — strike then run.',
    workout: youthSelfDefenseWorkouts.STRIKES,
  },
];
