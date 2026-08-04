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
      <div className="od-enter flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent mb-1">
            Mission · Today
          </p>
          <h1 className="font-display text-3xl text-tan uppercase tracking-wide">Dashboard</h1>
        </div>
        <p className="font-mono text-xs text-muted shrink-0 pb-1">{formatDisplayDate()}</p>
      </div>

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
        <div className="bg-bg2/50 border border-border rounded-card px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-sans text-sm text-muted">Pick a workout plan to get started.</p>
          <Link
            href="/workouts"
            className="od-cta inline-flex min-h-[40px] items-center rounded-card bg-accent px-4 py-2 font-sans text-sm font-bold uppercase text-black hover:shadow-glow"
          >
            Pick a plan
          </Link>
        </div>
      )}

      <p className="font-sans text-xs text-muted text-center pt-1">
        <Link href="/workouts" className="hover:text-tan transition-colors">
          Browse workout plans
        </Link>
        <span className="mx-2">·</span>
        <Link href="/analysis" className="hover:text-tan transition-colors">
          AI Analysis
        </Link>
      </p>
    </div>
  );
}
