'use client';

import { useState } from 'react';
import type { DailyStoicResponse } from '@/lib/daily-stoic';
import { shareDailyStoic } from '@/lib/share-daily-stoic';

type Props = {
  meditation: DailyStoicResponse;
  className?: string;
};

export function DailyStoicShareButton({ meditation, className = '' }: Props) {
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
    <button
      type="button"
      onClick={handleShare}
      disabled={sharing}
      className={
        className ||
        'w-full rounded-card border border-border bg-transparent py-3 font-sans text-sm font-bold text-muted hover:border-accent transition-colors disabled:opacity-40'
      }
    >
      {shareLabel}
    </button>
  );
}
