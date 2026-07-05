'use client';

import Link from 'next/link';
import type { DailyStoicResponse } from '@/lib/daily-stoic';
import { DailyStoicContent } from '@/components/daily-stoic/DailyStoicContent';

type Props = {
  meditation: DailyStoicResponse;
  onDismiss: () => void;
};

export function DailyStoicModal({ meditation, onDismiss }: Props) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 sm:p-6">
      <div className="w-full max-w-lg rounded-card border border-border bg-card p-6 sm:p-7 max-h-[90vh] flex flex-col">
        <DailyStoicContent meditation={meditation} variant="modal" />

        <Link
          href="/daily-stoic"
          onClick={onDismiss}
          className="font-sans text-xs text-accent3 hover:underline mb-4 mt-1"
        >
          Browse all days →
        </Link>

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
