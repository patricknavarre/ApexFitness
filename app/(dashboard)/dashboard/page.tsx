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
import { MomentumCard } from '@/components/progress/MomentumCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';

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
      <PageHeader
        eyebrow="Mission · Today"
        title="Dashboard"
        trailing={
          <p className="font-mono text-xs">{formatDisplayDate()}</p>
        }
      />

      <div className="od-enter od-enter-delay-1">
        <DashboardStatsRow
          activePlanId={activePlanId}
          planStartedAt={planStartedAt}
          activePlanDayNumber={activePlanDayNumber}
          activePlanDaySetOn={activePlanDaySetOn}
        />
      </div>

      <div className="od-enter od-enter-delay-1">
        <MomentumCard activePlanId={activePlanId} planStartedAt={planStartedAt} />
      </div>

      <div className="od-enter od-enter-delay-2">
        <TodayWorkoutCard
          activePlanId={activePlanId}
          planStartedAt={planStartedAt}
          activePlanDayNumber={activePlanDayNumber}
          activePlanDaySetOn={activePlanDaySetOn}
        />
      </div>

      <div className="od-enter od-enter-delay-2">
        <AiInsightCard />
      </div>

      <div className="od-enter od-enter-delay-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        <CaloriesTodayCard />
        <MacrosTodayCard />
      </div>

      <div className="od-enter od-enter-delay-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        <SuggestMealCard />
        <ProgressSnapshotCard />
      </div>

      {!activePlanId && (
        <AppCard
          padding="sm"
          className="od-enter od-enter-delay-3 flex flex-wrap items-center justify-between gap-2 bg-bg2/50"
        >
          <p className="font-sans text-sm text-muted">
            Pick a workout plan to get started.
          </p>
          <AppButton href="/workouts" className="min-h-[40px] px-4 py-2">
            Pick a plan
          </AppButton>
        </AppCard>
      )}

      <p className="font-sans text-xs text-muted text-center pt-1">
        <Link
          href="/workouts"
          className="hover:text-tan transition-colors duration-150"
        >
          Browse workout plans
        </Link>
        <span className="mx-2">·</span>
        <Link
          href="/analysis"
          className="hover:text-tan transition-colors duration-150"
        >
          AI Analysis
        </Link>
      </p>
    </div>
  );
}
