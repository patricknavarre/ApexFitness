import type { InteractiveWorkoutDay } from './recoveryWorkoutData';
import { getRecoveryWorkoutForDay, PHASE_COLOR } from './recoveryWorkoutData';
import { getLtDanWorkoutForDay } from './ltDanWorkoutData';
import { getAnklePtWorkoutForDay, ANKLE_PT_PHASE_COLOR } from './anklePtWorkoutData';
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
  if (day) return workoutDayToInteractive(day);
  return null;
}

export function getPhaseColors(planId: string): Record<string, { bg: string; accent: string; label: string }> {
  if (planId === 'lt-dan') {
    return {
      PUSH: { bg: '#1e3a5f', accent: '#3b82f6', label: 'Push Day' },
      PULL: { bg: '#1a3a2a', accent: '#10b981', label: 'Pull Day' },
      ARMS: { bg: '#2d1b4e', accent: '#a855f7', label: 'Arms & Core' },
    };
  }
  if (planId === 'ankle-pt') {
    return {
      STRENGTH: ANKLE_PT_PHASE_COLOR.STRENGTH,
      BALANCE: ANKLE_PT_PHASE_COLOR.BALANCE,
      MOBILITY: ANKLE_PT_PHASE_COLOR.MOBILITY,
    };
  }
  return {
    PUSH: PHASE_COLOR.PUSH,
    PULL: PHASE_COLOR.PULL,
    'LOWER + ANKLE': PHASE_COLOR['LOWER + ANKLE'],
    'CORE + LEGS': { bg: '#3b1a00', accent: '#f97316', label: 'Core + Legs' },
    ARMS: { bg: '#2d1b4e', accent: '#a855f7', label: 'Arms & Core' },
  };
}
