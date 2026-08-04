import { todayLocal } from '@/lib/local-date';

export type RestMacroTargets = {
  calorieTarget: number | null | undefined;
  proteinTarget: number | null | undefined;
};

export type RestMacroIntake = {
  calories: number;
  proteinG: number;
};

export type RestMacroStatus = {
  ready: boolean;
  targetsSet: boolean;
  caloriesHit: boolean;
  proteinHit: boolean;
  calories: number;
  proteinG: number;
  calorieTarget: number | null;
  proteinTarget: number | null;
  message: string;
};

/** Calories within 90–110% of target; protein ≥ 90% of target. */
export function evaluateRestDayMacros(
  intake: RestMacroIntake,
  targets: RestMacroTargets
): RestMacroStatus {
  const calorieTarget =
    typeof targets.calorieTarget === 'number' && targets.calorieTarget > 0
      ? targets.calorieTarget
      : null;
  const proteinTarget =
    typeof targets.proteinTarget === 'number' && targets.proteinTarget > 0
      ? targets.proteinTarget
      : null;

  const calories = Math.max(0, Number(intake.calories) || 0);
  const proteinG = Math.max(0, Number(intake.proteinG) || 0);

  if (calorieTarget == null || proteinTarget == null) {
    return {
      ready: false,
      targetsSet: false,
      caloriesHit: false,
      proteinHit: false,
      calories,
      proteinG,
      calorieTarget,
      proteinTarget,
      message: 'Set calorie and protein targets in Settings to credit rest days.',
    };
  }

  const caloriesHit = calories >= calorieTarget * 0.9 && calories <= calorieTarget * 1.1;
  const proteinHit = proteinG >= proteinTarget * 0.9;
  const ready = caloriesHit && proteinHit;

  let message: string;
  if (ready) {
    message = 'Macros hit — rest day can count toward your streak.';
  } else {
    const gaps: string[] = [];
    if (!caloriesHit) {
      gaps.push(`${Math.round(calories)}/${calorieTarget} cal (aim 90–110%)`);
    }
    if (!proteinHit) {
      gaps.push(`${Math.round(proteinG)}/${proteinTarget}g protein (aim ≥90%)`);
    }
    message = `Hit targets to credit rest: ${gaps.join(' · ')}`;
  }

  return {
    ready,
    targetsSet: true,
    caloriesHit,
    proteinHit,
    calories,
    proteinG,
    calorieTarget,
    proteinTarget,
    message,
  };
}

/** Reject future YYYY-MM-DD vs comparison today string. */
export function isFutureDateOnly(ymd: string, todayYmd = todayLocal()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return true;
  return ymd > todayYmd;
}
