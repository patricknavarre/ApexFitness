import type { InteractiveWorkoutDay, PhaseColor } from './recoveryWorkoutData';

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
  'Foam pad or folded towel (optional)',
];

export const anklePtWorkouts: Record<string, InteractiveWorkoutDay> = {
  STRENGTH: {
    phase: 'STRENGTH',
    warmup:
      '3–5 min: ankle pumps, ankle circles both directions, gentle towel stretch for calves',
    caution:
      'Post-boot strength day — ankle isolation only, minimal leg loading. Pain ≤3/10 is OK; sharp pain, swelling jump, or next-day limp means scale back. Match both sides.',
    sections: [
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
    ],
  },

  BALANCE: {
    phase: 'BALANCE',
    warmup: '3 min: ankle alphabet (write A–Z with big toe)',
    caution:
      'Proprioception rebuilds what the boot took away. Stay near a wall. Quality over duration — stop before form falls apart. No step-ups or band walks while recovering.',
    sections: [
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
    ],
  },

  MOBILITY: {
    phase: 'MOBILITY',
    warmup: '2–3 min easy stationary bike to warm the ankle',
    caution:
      'Mobility + easy bike endurance. PT guidance: bike instead of running. No forcing end-range. Mild stretch is good; pinching or sharp pain is not.',
    sections: [
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
    ],
  },
};

export function getAnklePtWorkoutForDay(dayNumber: number): InteractiveWorkoutDay | null {
  const phase = ANKLE_PT_SCHEDULE[(dayNumber - 1) % ANKLE_PT_SCHEDULE.length];
  if (phase === 'REST') return null;
  return anklePtWorkouts[phase] ?? null;
}
