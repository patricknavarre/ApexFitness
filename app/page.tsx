import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col relative z-10">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 relative">
        <h1 className="font-display text-7xl md:text-8xl tracking-wide text-accent shadow-glow">
          APEX
        </h1>
        <p className="font-sans text-muted text-lg md:text-xl mt-3">
          Your body. Your data. Your potential.
        </p>
        {/* Feature callouts */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl w-full">
          <div className="bg-card border border-border rounded-card p-6 text-center">
            <div className="text-accent3 font-mono text-sm uppercase tracking-wider mb-2">
              AI Analysis
            </div>
            <p className="font-sans text-muted text-sm">
              Upload a photo for AI-powered body analysis and personalized insights.
            </p>
          </div>
          <div className="bg-card border border-border rounded-card p-6 text-center">
            <div className="text-accent3 font-mono text-sm uppercase tracking-wider mb-2">
              Smart Planning
            </div>
            <p className="font-sans text-muted text-sm">
              Get workout and nutrition plans tailored to your goals and schedule.
            </p>
          </div>
          <div className="bg-card border border-border rounded-card p-6 text-center">
            <div className="text-accent3 font-mono text-sm uppercase tracking-wider mb-2">
              Track Progress
            </div>
            <p className="font-sans text-muted text-sm">
              Log workouts, meals, and progress photos to see your transformation.
            </p>
          </div>
        </div>
        <Link
          href="/auth/signup"
          className="mt-12 bg-accent text-black font-sans font-bold uppercase px-8 py-4 rounded-card hover:shadow-glow transition-all duration-200"
        >
          Start for Free
        </Link>
      </div>
    </main>
  );
}
