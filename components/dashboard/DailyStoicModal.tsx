'use client';

import type { DailyStoicResponse } from '@/lib/daily-stoic';

type Props = {
  meditation: DailyStoicResponse;
  onDismiss: () => void;
};

export function DailyStoicModal({ meditation, onDismiss }: Props) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 sm:p-6">
      <div className="w-full max-w-lg rounded-card border border-border bg-card p-6 sm:p-7 max-h-[90vh] flex flex-col">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">
          {meditation.dateLabel}
        </p>
        <h2 className="font-display text-2xl text-accent uppercase tracking-wide mb-4">
          {meditation.title}
        </h2>

        <div className="flex-1 overflow-y-auto max-h-[50vh] space-y-4 pr-1">
          <blockquote className="border-l-2 border-accent3/50 pl-4">
            <p className="font-sans text-sm text-muted italic leading-relaxed">
              {meditation.quote}
            </p>
            {meditation.source && (
              <cite className="mt-2 block font-mono text-[10px] uppercase tracking-widest text-muted not-italic">
                — {meditation.source}
              </cite>
            )}
          </blockquote>

          <p className="font-sans text-sm text-text leading-relaxed">{meditation.reflection}</p>
        </div>

        <p className="font-sans text-xs text-muted mt-4 mb-5">
          From <em>The Daily Stoic</em> by Ryan Holiday &amp; Stephen Hanselman
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="w-full rounded-card py-3 font-sans text-sm font-bold text-black bg-accent3 hover:shadow-glow-accent3 transition-all"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
