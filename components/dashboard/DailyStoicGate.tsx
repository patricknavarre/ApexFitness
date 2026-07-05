'use client';

import { useEffect, useState } from 'react';
import type { DailyStoicResponse } from '@/lib/daily-stoic';
import { DailyStoicModal } from '@/components/dashboard/DailyStoicModal';

const STORAGE_KEY = 'apex-daily-stoic-seen';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DailyStoicGate() {
  const [meditation, setMeditation] = useState<DailyStoicResponse | null>(null);

  useEffect(() => {
    const today = todayKey();
    try {
      if (localStorage.getItem(STORAGE_KEY) === today) return;
    } catch {
      return;
    }

    let cancelled = false;

    fetch('/api/daily-stoic')
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<DailyStoicResponse>;
      })
      .then((data) => {
        if (!cancelled && data) setMeditation(data);
      })
      .catch(() => {
        // silently skip if fetch fails
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleDismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, todayKey());
    } catch {
      // ignore storage errors
    }
    setMeditation(null);
  }

  if (!meditation) return null;

  return <DailyStoicModal meditation={meditation} onDismiss={handleDismiss} />;
}
