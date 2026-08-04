import type { InteractiveWorkoutDay } from './recoveryWorkoutData';
import { getRecoveryWorkoutForDay, PHASE_COLOR } from './recoveryWorkoutData';
import { getLtDanWorkoutForDay } from './ltDanWorkoutData';
import { getAnklePtWorkoutForDay, ANKLE_PT_PHASE_COLOR } from './anklePtWorkoutData';
import { getGolfWorkoutForDay, GOLF_PHASE_COLOR } from './golfWorkoutData';
import { getSoftballWorkoutForDay, SOFTBALL_PHASE_COLOR } from './softballWorkoutData';
import { YOUTH_SD_PHASE_COLOR } from './youthSelfDefenseWorkoutData';
import type { WorkoutDay, WorkoutExercise } from './workout-plans';

function parseSets(sets: string): number {
  const match = sets.match(/\d+/);
  return match ? parseInt(match[0], 10) : 3;
}

function workoutDayToInteractive(day: WorkoutDay): InteractiveWorkoutDay | null {
  if (day.isRest || day.exercises.length === 0) return null;
  return {
    phase: day.title,
    sections: [
      {
        title: day.title,
        exercises: day.exercises.map((ex: WorkoutExercise) => ({
          name: ex.name,
          sets: parseSets(ex.sets),
          reps: ex.reps,
          equip: 'DB',
        })),
      },
    ],
  };
}

export function getInteractiveWorkout(
  planId: string,
  dayNumber: number,
  day?: WorkoutDay
): InteractiveWorkoutDay | null {
  if (planId === 'recovery') return getRecoveryWorkoutForDay(dayNumber);
  if (planId === 'ankle-pt') return getAnklePtWorkoutForDay(dayNumber);
  if (planId === 'lt-dan') return getLtDanWorkoutForDay(dayNumber);
  if (planId === 'golf') return getGolfWorkoutForDay(dayNumber);
  if (planId === 'softball') return getSoftballWorkoutForDay(dayNumber);
  if (day) return workoutDayToInteractive(day);
  return null;
}

export function getPhaseColors(planId: string): Record<string, { bg: string; accent: string; label: string }> {
  if (planId === 'lt-dan') {
    return {
      PUSH: { bg: '#2A3318', accent: '#C4A35A', label: 'Push Day' },
      PULL: { bg: '#3D4A1F', accent: '#D2B48C', label: 'Pull Day' },
      ARMS: { bg: '#2A3318', accent: '#8B7355', label: 'Arms & Core' },
    };
  }
  if (planId === 'ankle-pt') {
    return {
      STRENGTH: ANKLE_PT_PHASE_COLOR.STRENGTH,
      BALANCE: ANKLE_PT_PHASE_COLOR.BALANCE,
      MOBILITY: ANKLE_PT_PHASE_COLOR.MOBILITY,
    };
  }
  if (planId === 'golf') {
    return {
      MOBILITY: GOLF_PHASE_COLOR.MOBILITY,
      POWER: GOLF_PHASE_COLOR.POWER,
      STABILITY: GOLF_PHASE_COLOR.STABILITY,
    };
  }
  if (planId === 'softball') {
    return {
      POWER: SOFTBALL_PHASE_COLOR.POWER,
      'ARM CARE': SOFTBALL_PHASE_COLOR['ARM CARE'],
      'LOWER DRIVE': SOFTBALL_PHASE_COLOR['LOWER DRIVE'],
    };
  }
  if (planId === 'youth-sd') {
    return {
      STANCE: YOUTH_SD_PHASE_COLOR.STANCE,
      'BREAK-FALLS': YOUTH_SD_PHASE_COLOR['BREAK-FALLS'],
      ESCAPES: YOUTH_SD_PHASE_COLOR.ESCAPES,
      STRIKES: YOUTH_SD_PHASE_COLOR.STRIKES,
    };
  }
  return {
    PUSH: PHASE_COLOR.PUSH,
    PULL: PHASE_COLOR.PULL,
    'LOWER + ANKLE': PHASE_COLOR['LOWER + ANKLE'],
    'CORE + LEGS': { bg: '#3D4A1F', accent: '#C4A35A', label: 'Core + Legs' },
    ARMS: { bg: '#2A3318', accent: '#8B7355', label: 'Arms & Core' },
  };
}
