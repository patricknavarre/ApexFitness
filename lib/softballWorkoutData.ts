import type { InteractiveWorkoutDay, PhaseColor } from './recoveryWorkoutData';

export const SOFTBALL_PHASE_COLOR: Record<string, PhaseColor> = {
  POWER: { bg: '#3D4A1F', accent: '#C4A35A', label: 'Power' },
  'ARM CARE': { bg: '#2A3318', accent: '#D2B48C', label: 'Arm Care' },
  'LOWER DRIVE': { bg: '#2A3318', accent: '#8B7355', label: 'Lower Drive' },
  REST: { bg: '#161a10', accent: '#8B7355', label: 'Rest' },
};

export const SOFTBALL_SCHEDULE = [
  'POWER',
  'ARM CARE',
  'REST',
  'LOWER DRIVE',
  'POWER',
  'REST',
  'REST',
] as const;

export const SOFTBALL_EQUIPMENT = [
  'Dumbbells',
  'Resistance bands (light–medium)',
  'Medicine ball (optional)',
  'Pull-up bar or sturdy band anchor',
];

export const softballWorkouts: Record<string, InteractiveWorkoutDay> = {
  POWER: {
    phase: 'POWER',
    warmup: '5 min: jump rope or easy jog in place, band pull-aparts, 2 easy med-ball rotational throws/side',
    caution:
      'Drive from the ground up — hips first, then torso. Soft landings on step-ups. Sharp shoulder or elbow pain = stop.',
    sections: [
      {
        title: 'Rotational & Upper Power',
        tag: 'Softball',
        exercises: [
          {
            name: 'Med-Ball Rotational Throw (or Band Chop)',
            sets: 3,
            reps: '6/side',
            equip: 'Med ball',
            note: 'Load the back hip, fire through contact — same sequencing as a hard swing',
          },
          {
            name: 'DB Push Press',
            sets: 3,
            reps: '6–8',
            equip: 'DB',
            note: 'Dip–drive–press. Explosive legs feed the upper body',
          },
          {
            name: 'Band Rotational Chop (low→high)',
            sets: 3,
            reps: '8/side',
            equip: 'Band',
            note: 'Anchor low; finish tall like driving through the zone',
          },
          {
            name: 'Chin-Up or Band Pulldown',
            sets: 3,
            reps: '6–10',
            equip: 'Band',
            note: 'Full hang → chest to bar/band. Strong back protects the throwing arm',
          },
        ],
      },
      {
        title: 'Explosive Lower',
        exercises: [
          {
            name: 'Explosive Step-Up',
            sets: 3,
            reps: '6/side',
            equip: 'Step',
            note: 'Drive through the front foot; soft land. Builds first-step pop out of the box',
          },
        ],
      },
    ],
  },

  'ARM CARE': {
    phase: 'ARM CARE',
    warmup: '4 min: arm circles, band pull-aparts, scapular shrugs — no heavy pressing',
    caution:
      'Keep loads light. This day is longevity for the throwing shoulder — pump, don’t grind. Pain ≠ progress.',
    sections: [
      {
        title: 'Rotator Cuff & Scapula',
        tag: 'Softball',
        exercises: [
          {
            name: 'Band External Rotation',
            sets: 3,
            reps: '12–15/side',
            equip: 'Band',
            note: 'Elbow pinned at side; rotate forearm out. Slow return',
          },
          {
            name: 'Band Internal Rotation',
            sets: 2,
            reps: '12–15/side',
            equip: 'Band',
            note: 'Same setup, rotate in — balance the cuff',
          },
          {
            name: 'Face Pull',
            sets: 3,
            reps: '12–15',
            equip: 'Band',
            note: 'Pull to eye line, externally rotate at the finish',
          },
          {
            name: 'Scapular Y / T / W Raises',
            sets: 2,
            reps: '8 each shape',
            equip: 'DB',
            note: 'Light DBs or empty hands — prone or bent-over. Own the scapula',
          },
        ],
      },
      {
        title: 'Shoulder Health Finishers',
        exercises: [
          {
            name: 'Serratus Punch (band or DB)',
            sets: 2,
            reps: '12–15',
            equip: 'Band',
            note: 'Reach long at the top — scapula wraps around the ribcage',
          },
          {
            name: 'Rear-Delt Fly (light)',
            sets: 2,
            reps: '12–15',
            equip: 'DB',
            note: 'Soft elbows; squeeze the rear delts — posture for the release point',
          },
        ],
      },
    ],
  },

  'LOWER DRIVE': {
    phase: 'LOWER DRIVE',
    warmup: '5 min: bodyweight squats, lateral lunges easy, calf raises, 20 sec/side single-leg balance',
    caution:
      'Knees track over mid-foot. Bound softly — quality laterals beat sloppy speed. Stop for sharp joint pain.',
    sections: [
      {
        title: 'Strength',
        tag: 'Softball',
        exercises: [
          {
            name: 'Goblet Squat',
            sets: 3,
            reps: '8–10',
            equip: 'DB',
            note: 'Elbows inside knees; sit between the heels — load for drive off the bag',
          },
          {
            name: 'Lateral Lunge',
            sets: 3,
            reps: '8/side',
            equip: 'DB',
            note: 'Push hips back into the working side — trains side-to-side base running',
          },
          {
            name: 'DB Romanian Deadlift',
            sets: 3,
            reps: '8–10',
            equip: 'DB',
            note: 'Hinge, feel hamstrings — posterior chain for acceleration',
          },
        ],
      },
      {
        title: 'Athleticism & Core',
        exercises: [
          {
            name: 'Skater Hop (controlled)',
            sets: 3,
            reps: '6/side',
            equip: 'Bodyweight',
            note: 'Stick the landing 1 sec before the next hop — lateral power with control',
          },
          {
            name: 'Calf Raise',
            sets: 2,
            reps: '12–15',
            equip: 'Bodyweight',
            note: 'Full ROM; pause at the top — spring for first steps',
          },
          {
            name: 'Pallof Press',
            sets: 2,
            reps: '10/side',
            equip: 'Band',
            note: 'Anti-rotation brace — stay quiet through contact and throws',
          },
        ],
      },
    ],
  },
};

export function getSoftballWorkoutForDay(dayNumber: number): InteractiveWorkoutDay | null {
  const phase = SOFTBALL_SCHEDULE[(dayNumber - 1) % SOFTBALL_SCHEDULE.length];
  if (phase === 'REST') return null;
  return softballWorkouts[phase] ?? null;
}
