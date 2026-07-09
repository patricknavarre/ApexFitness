import { WORKOUT_PLANS } from '@/lib/workout-plans';

/** Map AI recommended split text to the closest static plan id. */
export function recommendPlanId(
  recommendedSplit: string,
  fitnessLevel?: string,
  daysPerWeek?: number
): string {
  const split = recommendedSplit.toLowerCase();
  const level = (fitnessLevel ?? '').toLowerCase();
  const days = daysPerWeek ?? 5;

  if (split.includes('push') && split.includes('pull') && split.includes('leg')) {
    if (days >= 6) return '6-day-ppl-volume';
    if (level.includes('beginner')) return '4-day-beginner-split';
    return '5-day-ppl';
  }
  if (split.includes('upper') && split.includes('lower')) {
    if (level.includes('beginner')) return '4-day-beginner-split';
    return '4-day-upper-lower';
  }
  if (split.includes('full body') || split.includes('full-body')) {
    if (level.includes('beginner') || days <= 2) return '2-day-beginner';
    if (days <= 3) return '3-day-beginner';
    return '3-day-full-body';
  }
  if (split.includes('strength')) return '5-day-strength';
  if (split.includes('bro')) return '5-day-muscle';
  if (days <= 2) return '2-day-beginner';
  if (days <= 3) return '3-day-full-body';
  if (days <= 4) return '4-day-upper-lower';
  return '5-day-muscle';
}

export function getPlanName(planId: string): string {
  return WORKOUT_PLANS.find((p) => p.id === planId)?.name ?? planId;
}

export function todayPlanStartDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
