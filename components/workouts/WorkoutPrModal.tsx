'use client';

export type WorkoutPr = {
  name: string;
  weight: number;
  reps: number;
  previousWeight: number;
};

type Props = {
  prs: WorkoutPr[];
  onClose: () => void;
};

export function WorkoutPrModal({ prs, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-labelledby="workout-pr-title"
        className="w-full max-w-md rounded-card border border-border bg-card p-6 shadow-glow"
      >
        <h2
          id="workout-pr-title"
          className="font-display text-2xl text-tan uppercase tracking-wide"
        >
          New maxes
        </h2>
        <p className="mt-1 font-sans text-sm text-muted">Heaviest weight for these lifts.</p>
        <ul className="mt-5 space-y-3">
          {prs.map((pr) => (
            <li
              key={pr.name}
              className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
            >
              <span className="font-sans text-sm text-text">{pr.name}</span>
              <span className="shrink-0 text-right font-mono text-sm">
                <span className="text-accent font-bold">
                  {pr.weight} × {pr.reps}
                </span>
                {pr.previousWeight > 0 && (
                  <span className="mt-0.5 block text-xs text-muted">was {pr.previousWeight}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="od-cta mt-6 w-full rounded-card bg-accent px-6 py-3 font-sans text-sm font-bold uppercase text-black hover:shadow-glow"
        >
          Nice
        </button>
      </div>
    </div>
  );
}
