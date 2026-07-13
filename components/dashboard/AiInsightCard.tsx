'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocalTodayKey } from '@/lib/use-local-today-key';

type InsightPayload = {
  headline: string;
  body: string;
};

function normalizeInsight(data: unknown): InsightPayload | null {
  if (!data || typeof data !== 'object') return null;
  const insight = (data as { insight?: unknown }).insight;
  if (!insight) return null;
  if (typeof insight === 'string') {
    const trimmed = insight.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed) as { headline?: unknown; body?: unknown };
        if (typeof parsed.headline === 'string' && typeof parsed.body === 'string') {
          return { headline: parsed.headline.trim(), body: parsed.body.trim() };
        }
      } catch {
        // legacy plain string
      }
    }
    return { headline: "Today's focus", body: trimmed };
  }
  if (
    typeof insight === 'object' &&
    insight !== null &&
    typeof (insight as InsightPayload).headline === 'string' &&
    typeof (insight as InsightPayload).body === 'string'
  ) {
    return {
      headline: (insight as InsightPayload).headline.trim(),
      body: (insight as InsightPayload).body.trim(),
    };
  }
  return null;
}

export function AiInsightCard() {
  const [insight, setInsight] = useState<InsightPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const todayKey = useLocalTodayKey();

  const loadInsight = useCallback((dateKey: string) => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/insight?date=${encodeURIComponent(dateKey)}`)
      .then((res) => (res.ok ? res.json() : { insight: null }))
      .then((data) => {
        if (!cancelled) setInsight(normalizeInsight(data));
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
        <div className="h-4 w-40 bg-bg3 rounded mb-2" />
        <div className="h-16 bg-bg3 rounded" />
      </div>
    );
  }

  if (!insight) return null;

  return (
    <div className="bg-card border border-border rounded-card p-5 sm:p-6">
      <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-3">
        Today&apos;s insight
      </h2>
      <p className="font-sans font-medium text-text mb-2 leading-snug">{insight.headline}</p>
      <p className="font-sans text-sm text-muted leading-relaxed">{insight.body}</p>
    </div>
  );
}
