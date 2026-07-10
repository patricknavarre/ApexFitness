'use client';

import { useState, useEffect } from 'react';
import { todayLocal } from '@/lib/local-date';

/** Local YYYY-MM-DD that updates on visibility change and every minute (midnight-safe). */
export function useLocalTodayKey(): string {
  const [todayKey, setTodayKey] = useState(() => todayLocal());

  useEffect(() => {
    const sync = () => {
      const next = todayLocal();
      setTodayKey((prev) => (prev !== next ? next : prev));
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', sync);
    const id = window.setInterval(sync, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', sync);
      window.clearInterval(id);
    };
  }, []);

  return todayKey;
}
