'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocalTodayKey } from '@/lib/use-local-today-key';

export function AiInsightCard() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const todayKey = useLocalTodayKey();

  const loadInsight = useCallback(
    (dateKey: string) => {
      let cancelled = false;
      setLoading(true);
      fetch(`/api/insight?date=${encodeURIComponent(dateKey)}`)
        .then((res) => (res.ok ? res.json() : { insight: null }))
        .then((data) => {
          if (!cancelled) setInsight(data.insight ?? null);
        })
        .catch(() => {
          if (!cancelled) setInsight(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    },
    []
  );

  useEffect(() => {
    return loadInsight(todayKey);
  }, [loadInsight, todayKey]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') loadInsight(todayKey);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [loadInsight, todayKey]);

  if (loading && !insight) {
    return (
      <div className="bg-card border border-border rounded-card p-5 sm:p-6 animate-pulse">
        <div className="h-4 w-24 bg-bg3 rounded mb-3" />
        <div className="h-12 bg-bg3 rounded" />
      </div>
    );
  }

  if (!insight) return null;

  return (
    <div className="bg-card border border-border rounded-card p-5 sm:p-6">
      <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
        Today&apos;s insight
      </h2>
      <p className="font-sans text-sm text-text leading-relaxed">{insight}</p>
    </div>
  );
}
