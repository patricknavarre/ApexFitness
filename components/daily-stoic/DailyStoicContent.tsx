'use client';

import type { DailyStoicResponse } from '@/lib/daily-stoic';

type Props = {
  meditation: DailyStoicResponse;
  variant?: 'modal' | 'page';
  className?: string;
};

export function DailyStoicContent({ meditation, variant = 'page', className = '' }: Props) {
  const isModal = variant === 'modal';

  return (
    <div className={className}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">
        {meditation.dateLabel}
      </p>
      <h2
        className={`font-display text-accent uppercase tracking-wide mb-5 ${
          isModal ? 'text-2xl' : 'text-3xl sm:text-4xl'
        }`}
      >
        {meditation.title}
      </h2>

      <div className={`space-y-5 ${isModal ? 'max-h-[50vh] overflow-y-auto pr-1' : ''}`}>
        <blockquote className="relative border-l-2 border-accent3/50 pl-5">
          <span
            className="absolute -left-1 -top-2 font-display text-4xl text-accent3/20 leading-none select-none"
            aria-hidden
          >
            &ldquo;
          </span>
          <p
            className={`font-sans text-muted italic leading-relaxed ${
              isModal ? 'text-sm' : 'text-base sm:text-lg'
            }`}
          >
            {meditation.quote}
          </p>
          {meditation.source && (
            <cite className="mt-3 block font-mono text-[10px] uppercase tracking-widest text-muted not-italic">
              — {meditation.source}
            </cite>
          )}
        </blockquote>

        <p
          className={`font-sans text-text leading-relaxed ${
            isModal ? 'text-sm' : 'text-base leading-7'
          }`}
        >
          {meditation.reflection}
        </p>
      </div>

      <p className={`font-sans text-xs text-muted ${isModal ? 'mt-4' : 'mt-6'}`}>
        From <em>The Daily Stoic</em> by Ryan Holiday &amp; Stephen Hanselman
      </p>
    </div>
  );
}
