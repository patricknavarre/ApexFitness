'use client';

import { useState, useEffect } from 'react';

export function AiInsightCard() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/insight')
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
  }, []);

  if (loading) {
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
