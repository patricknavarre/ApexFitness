import { todayLocal, planStartedAtForDayNumber } from '@/lib/local-date';
import { WORKOUT_PLANS, getActivePlanDay } from '@/lib/workout-plans';

export type ActivePlanState = {
  activePlanId: string | null;
  planStartedAt: string | null;
  activePlanDayNumber: number | null;
  activePlanDaySetOn: string | null;
};

export type SyncedActivePlan = {
  activePlanId: string;
  planStartedAt: string;
  activePlanDayNumber: null;
  activePlanDaySetOn: null;
  changed: boolean;
  planName: string;
  dayNumber: number;
};

/**
 * Ensure the user's active plan matches the plan/day they just started or logged.
 * Re-anchors planStartedAt so the calendar lands on that day, and clears same-day overrides.
 * No-ops when already scheduled for that day. Does not activate self-defense (youth-sd).
 */
export async function syncActivePlanToDay(
  planId: string,
  dayNumber: number,
  current: ActivePlanState,
  today: string = todayLocal()
): Promise<SyncedActivePlan | null> {
  if (planId === 'youth-sd') return null;
  const plan = WORKOUT_PLANS.find((p) => p.id === planId);
  if (!plan || !Number.isFinite(dayNumber) || dayNumber < 1) return null;
  const day = plan.days.find((d) => d.dayNumber === dayNumber);
  if (!day || day.isRest) return null;

  if (current.activePlanId === planId && current.planStartedAt) {
    const scheduled = getActivePlanDay(
      plan,
      current.planStartedAt,
      current.activePlanDayNumber,
      current.activePlanDaySetOn,
      today
    );
    if (scheduled?.dayNumber === dayNumber) {
      return {
        activePlanId: planId,
        planStartedAt: current.planStartedAt,
        activePlanDayNumber: null,
        activePlanDaySetOn: null,
        changed: false,
        planName: plan.name,
        dayNumber,
      };
    }
  }

  const planStartedAt = planStartedAtForDayNumber(dayNumber, today);
  const res = await fetch('/api/user/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      activePlanId: planId,
      planStartedAt,
      activePlanDayNumber: null,
      activePlanDaySetOn: null,
    }),
  });
  if (!res.ok) throw new Error('Failed to sync active plan');

  return {
    activePlanId: planId,
    planStartedAt,
    activePlanDayNumber: null,
    activePlanDaySetOn: null,
    changed: true,
    planName: plan.name,
    dayNumber,
  };
}
