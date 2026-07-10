import Link from 'next/link';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { serializeDateOnly } from '@/lib/local-date';
import { DashboardStatsRow } from '@/components/dashboard/DashboardStatsRow';
import { TodayWorkoutCard } from '@/components/dashboard/TodayWorkoutCard';
import { SuggestMealCard } from '@/components/dashboard/SuggestMealCard';
import { CaloriesTodayCard } from '@/components/dashboard/CaloriesTodayCard';
import { MacrosTodayCard } from '@/components/dashboard/MacrosTodayCard';
import { ProgressSnapshotCard } from '@/components/dashboard/ProgressSnapshotCard';
import { AiInsightCard } from '@/components/dashboard/AiInsightCard';

function formatDisplayDate(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default async function DashboardPage() {
  const session = await auth();
  let activePlanId: string | null = null;
  let planStartedAt: string | null = null;
  let activePlanDayNumber: number | null = null;
  let activePlanDaySetOn: string | null = null;
  if (session?.user?.id) {
    try {
      await connectDB();
      const user = await User.findById(session.user.id)
        .select('activePlanId planStartedAt activePlanDayNumber activePlanDaySetOn')
        .lean();
      if (user && !Array.isArray(user)) {
        activePlanId = (user.activePlanId as string) ?? null;
        planStartedAt = serializeDateOnly(user.planStartedAt as Date | undefined);
        activePlanDayNumber =
          typeof user.activePlanDayNumber === 'number' ? user.activePlanDayNumber : null;
        activePlanDaySetOn =
          typeof user.activePlanDaySetOn === 'string' ? user.activePlanDaySetOn : null;
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5 max-w-4xl">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-3xl text-accent uppercase tracking-wide">
          Dashboard
        </h1>
        <p className="font-sans text-sm text-muted shrink-0">{formatDisplayDate()}</p>
      </div>

      <DashboardStatsRow
        activePlanId={activePlanId}
        planStartedAt={planStartedAt}
        activePlanDayNumber={activePlanDayNumber}
        activePlanDaySetOn={activePlanDaySetOn}
      />

      <TodayWorkoutCard
        activePlanId={activePlanId}
        planStartedAt={planStartedAt}
        activePlanDayNumber={activePlanDayNumber}
        activePlanDaySetOn={activePlanDaySetOn}
      />

      <AiInsightCard />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CaloriesTodayCard />
        <MacrosTodayCard />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SuggestMealCard />
        <ProgressSnapshotCard />
      </div>

      {!activePlanId && (
        <div className="bg-bg2/50 border border-border rounded-card px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-sans text-sm text-muted">
            Pick a workout plan to get started.
          </p>
          <Link
            href="/workouts"
            className="font-sans text-sm text-accent3 hover:underline shrink-0"
          >
            Pick a plan →
          </Link>
        </div>
      )}

      <p className="font-sans text-xs text-muted text-center pt-1">
        <Link href="/workouts" className="hover:text-accent transition-colors">
          Browse workout plans
        </Link>
        <span className="mx-2">·</span>
        <Link href="/analysis" className="hover:text-accent transition-colors">
          AI Analysis
        </Link>
      </p>
    </div>
  );
}
