import type { InteractiveWorkoutDay, PhaseColor } from './recoveryWorkoutData';

export const GOLF_PHASE_COLOR: Record<string, PhaseColor> = {
  MOBILITY: { bg: '#2A3318', accent: '#8B7355', label: 'Mobility' },
  POWER: { bg: '#3D4A1F', accent: '#C4A35A', label: 'Rotational Power' },
  STABILITY: { bg: '#2A3318', accent: '#D2B48C', label: 'Stability' },
  REST: { bg: '#161a10', accent: '#8B7355', label: 'Rest' },
};

export const GOLF_SCHEDULE = [
  'MOBILITY',
  'POWER',
  'REST',
  'STABILITY',
  'POWER',
  'REST',
  'REST',
] as const;

export const GOLF_EQUIPMENT = [
  'Dumbbells',
  'Resistance bands (light–medium)',
  'Medicine ball (or heavy pillow substitute)',
  'Foam roller (optional)',
];

export const golfWorkouts: Record<string, InteractiveWorkoutDay> = {
  MOBILITY: {
    phase: 'MOBILITY',
    warmup: '4–5 min: easy march in place, arm swings, gentle hip circles both ways',
    caution:
      'Move into soft end-ranges — never force rotation. Sharp low-back or shoulder pain means back off. Quality > stretch intensity.',
    sections: [
      {
        title: 'Thoracic & Shoulder',
        tag: 'Golf',
        exercises: [
          {
            name: 'Open-Book Thoracic Rotation',
            sets: 2,
            reps: '8/side',
            equip: 'Bodyweight',
            note: 'Side-lying, knees stacked — open the top arm like turning through the swing',
          },
          {
            name: 'Band Dislocates',
            sets: 2,
            reps: '10–12',
            equip: 'Band',
            note: 'Wide grip; keep ribs down. Opens the shoulders for a freer backswing',
          },
          {
            name: "World's Greatest Stretch",
            sets: 2,
            reps: '5/side',
            equip: 'Bodyweight',
            note: 'Lunge + twist toward the front knee — hip flexor + thoracic in one move',
          },
        ],
      },
      {
        title: 'Hips & Ankles',
        exercises: [
          {
            name: '90/90 Hip Switches',
            sets: 2,
            reps: '8/side',
            equip: 'Bodyweight',
            note: 'Sit tall; rotate both legs together. Builds hip IR/ER for stable address',
          },
          {
            name: 'Ankle Rocks (knee-over-toe)',
            sets: 2,
            reps: '10/side',
            equip: 'Bodyweight',
            note: 'Soft knee drive over mid-foot — trail-ankle mobility for a deep turn',
          },
          {
            name: 'Golf-Posture Hinge Hold',
            sets: 2,
            reps: '20–30 sec',
            equip: 'Bodyweight',
            note: 'Soft knees, hinge at hips, long spine — own your address posture',
          },
        ],
      },
    ],
  },

  POWER: {
    phase: 'POWER',
    warmup: '5 min: band pull-aparts, bodyweight good mornings, 2 easy rotational chops each side',
    caution:
      'Explode through the mid-range, control the finish. Lead with the hips, not the low back. Stop if the lumbar takes over.',
    sections: [
      {
        title: 'Rotational Power',
        tag: 'Golf',
        exercises: [
          {
            name: 'Med-Ball Rotational Throw (or Band Chop)',
            sets: 3,
            reps: '6/side',
            equip: 'Med ball',
            note: 'Hip-shoulder separation — throw or chop through like clearing the hips',
          },
          {
            name: 'Standing Band Woodchop (high→low)',
            sets: 3,
            reps: '8/side',
            equip: 'Band',
            note: 'Anchor high; rotate through the core. Smooth acceleration, soft finish',
          },
          {
            name: 'Standing Rotational Band Press',
            sets: 3,
            reps: '8/side',
            equip: 'Band',
            note: 'Press away while rotating toward the lead side — trains sequenced power',
          },
        ],
      },
      {
        title: 'Posterior Chain & Grip',
        exercises: [
          {
            name: 'DB Romanian Deadlift',
            sets: 3,
            reps: '8–10',
            equip: 'DB',
            note: 'Soft knees, push hips back — powers the downswing from the ground',
          },
          {
            name: 'Farmer Carry',
            sets: 3,
            reps: '30–40 sec',
            equip: 'DB',
            note: 'Tall posture, crush the handles — grip + trunk brace for club control',
          },
        ],
      },
    ],
  },

  STABILITY: {
    phase: 'STABILITY',
    warmup: '4 min: glute bridges, dead bugs slow, single-leg balance 20 sec/side',
    caution:
      'Own every rep on one leg before adding load. Wobbly = too heavy. Lead-leg stability is your finish.',
    sections: [
      {
        title: 'Single-Leg Strength',
        tag: 'Golf',
        exercises: [
          {
            name: 'Single-Leg DB RDL',
            sets: 3,
            reps: '8/side',
            equip: 'DB',
            note: 'Hinge over the stance leg — trail hip stays square like a balanced finish',
          },
          {
            name: 'Rear-Foot Elevated Split Squat',
            sets: 3,
            reps: '8–10/side',
            equip: 'DB',
            note: 'Front knee tracks over mid-foot; upright torso',
          },
        ],
      },
      {
        title: 'Anti-Rotation Core',
        exercises: [
          {
            name: 'Pallof Press',
            sets: 3,
            reps: '10/side',
            equip: 'Band',
            note: 'Resist the pull — trains the brace that holds your swing plane',
          },
          {
            name: 'Side Plank',
            sets: 2,
            reps: '20–40 sec/side',
            equip: 'Bodyweight',
            note: 'Stack hips; don’t sag. Lateral stability for weight shift',
          },
          {
            name: 'Dead Bug (slow)',
            sets: 2,
            reps: '8/side',
            equip: 'Bodyweight',
            note: 'Exhale as the limb extends — ribs down, low back glued to floor',
          },
        ],
      },
    ],
  },
};

export function getGolfWorkoutForDay(dayNumber: number): InteractiveWorkoutDay | null {
  const phase = GOLF_SCHEDULE[(dayNumber - 1) % GOLF_SCHEDULE.length];
  if (phase === 'REST') return null;
  return golfWorkouts[phase] ?? null;
}
