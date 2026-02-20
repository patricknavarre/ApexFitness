import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="font-display text-3xl text-accent uppercase tracking-wide">
        Dashboard
      </h1>
      {/* First-time / empty state */}
      <div className="bg-card border border-border rounded-card p-8 text-center">
        <p className="font-sans text-muted mb-4">
          Get started with an AI-powered body analysis to unlock personalized workouts and
          nutrition.
        </p>
        <Link
          href="/analysis"
          className="inline-block bg-accent text-black font-sans font-bold uppercase px-6 py-3 rounded-card hover:shadow-glow transition-shadow"
        >
          Start with AI Analysis
        </Link>
      </div>
      {/* Placeholder widget row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-card p-6">
          <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
            Today&apos;s Workout
          </h2>
          <p className="font-sans text-muted text-sm">No workout scheduled.</p>
        </div>
        <div className="bg-card border border-border rounded-card p-6">
          <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
            Weekly streak
          </h2>
          <p className="font-mono text-accent3">0 / 5 workouts</p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-card p-6">
        <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
          Calories today
        </h2>
        <p className="font-sans text-muted text-sm">Log meals in Nutrition to see your progress.</p>
      </div>
    </div>
  );
}
