'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DailyStoicResponse } from '@/lib/daily-stoic';
import { shareDailyStoic } from '@/lib/share-daily-stoic';
import { DailyStoicContent } from '@/components/daily-stoic/DailyStoicContent';

type Props = {
  meditation: DailyStoicResponse;
  onDismiss: () => void;
};

export function DailyStoicModal({ meditation, onDismiss }: Props) {
  const [shareLabel, setShareLabel] = useState('Share');
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      const result = await shareDailyStoic(meditation);
      if (result === 'copied') {
        setShareLabel('Copied!');
        window.setTimeout(() => setShareLabel('Share'), 2000);
      }
    } catch {
      // AbortError (user cancelled share sheet) or clipboard failure — leave label as Share
    } finally {
      setSharing(false);
    }
  }

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

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="w-full rounded-card border border-border bg-transparent py-3 font-sans text-sm font-bold text-muted hover:border-accent transition-colors disabled:opacity-40"
          >
            {shareLabel}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full rounded-card py-3 font-sans text-sm font-bold text-black bg-accent3 hover:shadow-glow-accent3 transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
