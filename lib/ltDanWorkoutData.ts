import type { InteractiveWorkoutDay, PhaseColor } from './recoveryWorkoutData';

export const LT_DAN_PHASE_COLOR: Record<string, PhaseColor> = {
  PUSH: { bg: '#1e3a5f', accent: '#3b82f6', label: 'Push Day' },
  PULL: { bg: '#1a3a2a', accent: '#10b981', label: 'Pull Day' },
  ARMS: { bg: '#2d1b4e', accent: '#a855f7', label: 'Arms & Core' },
  REST: { bg: '#1e293b', accent: '#475569', label: 'Rest' },
};

export const LT_DAN_SCHEDULE = [
  'PUSH',
  'PULL',
  'REST',
  'ARMS',
  'PUSH',
  'PULL',
  'REST',
] as const;

export const ltDanWorkouts: Record<string, InteractiveWorkoutDay> = {
  PUSH: {
    phase: 'PUSH',
    warmup: '5 min: band pull-aparts, seated arm circles, light chest flyes',
    caution:
      "I ain't got no legs — all exercises seated or lying. Magic legs not required.",
    sections: [
      {
        title: 'Chest — Shrimp Boat Press',
        exercises: [
          {
            name: 'Incline DB Press',
            sets: 4,
            reps: '10–12',
            equip: 'DB + bench',
            note: 'Lieutenant Dan would want that chest proud. Full ROM, controlled.',
          },
          {
            name: 'Flat DB Bench Press',
            sets: 4,
            reps: '10–12',
            equip: 'DB + bench',
            note: 'Flat on the bench — the only kind of flat Lt. Dan approves of.',
          },
          {
            name: 'Flat DB Fly',
            sets: 3,
            reps: '12–15',
            equip: 'DB + bench',
            note: 'Slight bend in elbows, big stretch at the bottom.',
          },
        ],
      },
      {
        title: 'Shoulders — Storm Watch',
        exercises: [
          {
            name: 'Seated DB Shoulder Press',
            sets: 4,
            reps: '10–12',
            equip: 'DB + bench',
            note: 'Press overhead like you are saluting the open sea.',
          },
          {
            name: 'Seated DB Lateral Raise',
            sets: 3,
            reps: '15',
            equip: 'DB',
            note: 'Lead with elbows. No swinging — we have standards.',
          },
          {
            name: 'Seated DB Front Raise',
            sets: 3,
            reps: '12',
            equip: 'DB',
            note: 'Alternate arms, thumbs up.',
          },
        ],
      },
      {
        title: 'Triceps — Ping Pong Guns',
        exercises: [
          {
            name: 'Close-Grip DB Press',
            sets: 3,
            reps: '10–12',
            equip: 'DB + bench',
            note: 'DBs touching at center of chest, elbows tucked tight.',
          },
          {
            name: 'Lying DB Tricep Extension',
            sets: 3,
            reps: '12',
            equip: 'DB + bench',
            note: 'Lower behind head, elbows stay put.',
          },
          {
            name: 'Seated Overhead DB Extension',
            sets: 3,
            reps: '12–15',
            equip: 'DB',
            note: 'Full stretch at the bottom. Both hands on one DB.',
          },
        ],
      },
    ],
  },

  PULL: {
    phase: 'PULL',
    warmup: '5 min: band pull-aparts, scapular retractions, seated rotations',
    caution: 'Seated or lying only. Zero leg involvement — by design.',
    sections: [
      {
        title: 'Back — Net Mending Rows',
        exercises: [
          {
            name: 'Prone Incline DB Row',
            sets: 4,
            reps: '10–12',
            equip: 'DB + bench',
            note: 'Chest-down on incline bench. Row like you are hauling in the big catch.',
          },
          {
            name: 'Single-Arm DB Row',
            sets: 4,
            reps: '10–12 each',
            equip: 'DB + bench',
            note: 'Knee and hand on bench, drive elbow back and up.',
          },
          {
            name: 'Seated Band Row',
            sets: 3,
            reps: '15',
            equip: 'Band cable column',
            note: 'Full scapular squeeze at the end of each rep.',
          },
          {
            name: 'Band Straight-Arm Pulldown (seated)',
            sets: 3,
            reps: '15',
            equip: 'Band cable column',
            note: 'Arms straight, pull to thighs. Feel the lats.',
          },
        ],
      },
      {
        title: 'Rear Delts & Cuff',
        exercises: [
          {
            name: 'Incline DB Rear Delt Fly',
            sets: 3,
            reps: '15',
            equip: 'DB + bench',
            note: 'Lie chest-down, arms wide, squeeze those rear delts.',
          },
          {
            name: 'Band Face Pull (seated)',
            sets: 3,
            reps: '20',
            equip: 'Band cable column',
            note: 'Pull to forehead, elbows high. Shoulder health is non-negotiable.',
          },
          {
            name: 'Band External Rotation',
            sets: 3,
            reps: '15 each',
            equip: 'Band',
            note: 'Elbow at 90°, slow rotation out.',
          },
        ],
      },
      {
        title: 'Biceps — Bubba Gump Curls',
        exercises: [
          {
            name: 'Seated DB Curl',
            sets: 4,
            reps: '10–12',
            equip: 'DB',
            note: 'Sit upright, elbows pinned, full supination at the top.',
          },
          {
            name: 'Seated Incline DB Curl',
            sets: 3,
            reps: '12',
            equip: 'DB + bench',
            note: 'Bench at ~60°, arms hang — brutal stretch, zero cheating.',
          },
          {
            name: 'Seated Hammer Curl',
            sets: 3,
            reps: '12–15',
            equip: 'DB',
            note: 'Neutral grip. Alternate if you want.',
          },
        ],
      },
    ],
  },

  ARMS: {
    phase: 'ARMS',
    warmup: '5 min: light curls, band pull-aparts, wrist circles',
    caution: 'Arms, shoulders, and core only. Legs? What legs?',
    sections: [
      {
        title: 'Arms — Magic Legs Not Included',
        exercises: [
          {
            name: 'Seated Incline DB Curl',
            sets: 3,
            reps: '12',
            equip: 'DB + bench',
            note: 'Superset partner: tricep work below.',
          },
          {
            name: 'Seated Overhead DB Extension',
            sets: 3,
            reps: '12–15',
            equip: 'DB',
            note: 'Pair with curls. Minimal rest between.',
          },
          {
            name: 'Seated Hammer Curl',
            sets: 3,
            reps: '12',
            equip: 'DB',
            note: 'Neutral grip, controlled eccentric.',
          },
          {
            name: 'Band Tricep Pushdown (seated)',
            sets: 3,
            reps: '15',
            equip: 'Band cable column',
            note: 'Elbows pinned at sides.',
          },
          {
            name: 'Seated DB Lateral Raise',
            sets: 4,
            reps: '15',
            equip: 'DB',
            note: 'Burn out the shoulders. Lt. Dan demands dedication.',
          },
          {
            name: 'Band Curl (seated)',
            sets: 3,
            reps: '15',
            equip: 'Band',
            note: 'Constant tension finisher.',
          },
        ],
      },
      {
        title: 'Core — Anchor Down',
        exercises: [
          {
            name: 'DB Rollout (from knees)',
            sets: 3,
            reps: '10',
            equip: 'DB',
            note: 'Kneel on mat, roll forward slowly, pull back with control.',
          },
          {
            name: 'Dead Bug',
            sets: 3,
            reps: '10 each side',
            equip: 'Bodyweight',
            note: 'Lower back pressed into floor the entire time.',
          },
          {
            name: 'Seated Russian Twist',
            sets: 3,
            reps: '20',
            equip: 'DB',
            note: 'Lean back slightly, rotate side to side with DB.',
          },
          {
            name: 'Band Pallof Press (seated)',
            sets: 3,
            reps: '12 each side',
            equip: 'Band cable column',
            note: 'Anti-rotation. Hold at full extension.',
          },
        ],
      },
    ],
  },
};

export function getLtDanWorkoutForDay(dayNumber: number): InteractiveWorkoutDay | null {
  const phase = LT_DAN_SCHEDULE[(dayNumber - 1) % LT_DAN_SCHEDULE.length];
  if (phase === 'REST') return null;
  return ltDanWorkouts[phase] ?? null;
}
