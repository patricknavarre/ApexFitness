import type { InteractiveWorkoutDay, PhaseColor } from './recoveryWorkoutData';

export const ANKLE_PT_PHASE_COLOR: Record<string, PhaseColor> = {
  STRENGTH: { bg: '#1a3a2a', accent: '#10b981', label: 'Ankle Strength' },
  BALANCE: { bg: '#3b2f00', accent: '#eab308', label: 'Balance & Proprioception' },
  MOBILITY: { bg: '#1e3a5f', accent: '#3b82f6', label: 'Mobility & Endurance' },
  REST: { bg: '#1e293b', accent: '#475569', label: 'Rest' },
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
  'Resistance bands (light–medium)',
  'Step or calf raise machine',
  'Foam pad or folded towel (optional)',
  'Wall or rack for support',
  'Light dumbbells (optional)',
];

export const anklePtWorkouts: Record<string, InteractiveWorkoutDay> = {
  STRENGTH: {
    phase: 'STRENGTH',
    warmup:
      '3–5 min: ankle pumps, ankle circles both directions, gentle towel stretch for calves',
    caution:
      'Post-boot strength day. Pain ≤3/10 is OK; sharp pain, swelling jump, or next-day limp means scale back. Match both sides.',
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
        title: 'Calf & Tibialis Loading',
        exercises: [
          {
            name: 'Double-Leg Calf Raise',
            sets: 3,
            reps: '12–15',
            equip: 'Step',
            note: 'Use a step for stretch if comfortable. 2-sec up, 3-sec down',
          },
          {
            name: 'Eccentric Heel Drop (bilateral → single)',
            sets: 3,
            reps: '8–10',
            equip: 'Step',
            note: 'Rise with both feet; lower mostly on target side over 3–4 sec. Hold wall',
          },
          {
            name: 'Seated Calf Raise',
            sets: 3,
            reps: '15–20',
            equip: 'Machine',
            note: 'Or DB on knee. Full stretch at bottom; targets soleus',
          },
          {
            name: 'Seated Tibialis Raise',
            sets: 3,
            reps: '15–20',
            equip: 'Bodyweight',
            note: 'Heels down, lift toes. Add light plate on toes when easy',
          },
        ],
      },
    ],
  },

  BALANCE: {
    phase: 'BALANCE',
    warmup: '3 min: ankle alphabet (write A–Z with big toe), gentle weight shifts side to side',
    caution:
      'Proprioception rebuilds what the boot took away. Stay near a wall. Quality over duration — stop before form falls apart.',
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
        title: 'Dynamic Control',
        exercises: [
          {
            name: 'Heel-to-Toe Walk',
            sets: 3,
            reps: '20 steps',
            equip: 'Bodyweight',
            note: 'Straight line; slow and controlled. Turn and walk back',
          },
          {
            name: 'Lateral Band Walk',
            sets: 3,
            reps: '10 steps each way',
            equip: 'Band',
            note: 'Band above knees or at ankles. Stay athletic — don’t let knees cave',
          },
          {
            name: 'Step-Up (low box)',
            sets: 3,
            reps: '8–10/leg',
            equip: 'Step',
            note: 'Drive through whole foot; control the lower. Start with 6–8" box',
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
    warmup: '2–3 min easy bike or treadmill walk to warm the ankle',
    caution:
      'Mobility + light endurance. No forcing end-range. Mild stretch is good; pinching or sharp pain is not.',
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
        title: 'Light Endurance Loading',
        exercises: [
          {
            name: 'Seated Band Ankle 4-Way Circuit',
            sets: 2,
            reps: '10 each direction/side',
            equip: 'Band',
            note: 'DF → PF → INV → EV with minimal rest between directions',
          },
          {
            name: 'Double-Leg Calf Raise (endurance)',
            sets: 2,
            reps: '20–25',
            equip: 'Step',
            note: 'Lighter effort, higher reps. Smooth tempo',
          },
          {
            name: 'Treadmill Incline Walk',
            sets: 1,
            reps: '8–12 min',
            equip: 'Machine',
            note: 'Easy pace, slight incline. Focus on heel-to-toe push-off. Stop if swelling rises',
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
