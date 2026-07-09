'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type LogEntry = {
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
};

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number | null; color: string }) {
  const pct = target && target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between font-sans text-xs mb-1">
        <span className="text-muted">{label}</span>
        <span className="text-text">
          {Math.round(value)}
          {target != null && <span className="text-muted"> / {target}g</span>}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-bg3 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function MacrosTodayCard() {
  const [loading, setLoading] = useState(true);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [proteinTarget, setProteinTarget] = useState<number | null>(null);
  const [carbTarget, setCarbTarget] = useState<number | null>(null);
  const [fatTarget, setFatTarget] = useState<number | null>(null);

  const today = todayLocal();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/nutrition?date=${encodeURIComponent(today)}`).then((r) =>
        r.ok ? r.json() : { entries: [] }
      ),
      fetch('/api/user/me').then((r) => (r.ok ? r.json() : {})),
    ])
      .then(([nutritionData, userData]) => {
        if (cancelled) return;
        const entries: LogEntry[] = nutritionData.entries ?? [];
        const user = userData as {
          proteinTarget?: number | null;
          carbTarget?: number | null;
          fatTarget?: number | null;
        };
        setProtein(entries.reduce((s, e) => s + (e.proteinG ?? 0), 0));
        setCarbs(entries.reduce((s, e) => s + (e.carbsG ?? 0), 0));
        setFat(entries.reduce((s, e) => s + (e.fatG ?? 0), 0));
        setProteinTarget(typeof user.proteinTarget === 'number' ? user.proteinTarget : null);
        setCarbTarget(typeof user.carbTarget === 'number' ? user.carbTarget : null);
        setFatTarget(typeof user.fatTarget === 'number' ? user.fatTarget : null);
      })
      .catch(() => {
        if (!cancelled) {
          setProtein(0);
          setCarbs(0);
          setFat(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [today]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-card p-5 sm:p-6 animate-pulse">
        <div className="h-4 w-24 bg-bg3 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-6 bg-bg3 rounded" />
          <div className="h-6 bg-bg3 rounded" />
          <div className="h-6 bg-bg3 rounded" />
        </div>
      </div>
    );
  }

  return (
    <Link
      href="/nutrition"
      className="block bg-card border border-border rounded-card p-5 sm:p-6 hover:border-accent/40 transition-colors"
    >
      <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-4">
        Macros today
      </h2>
      <div className="space-y-3">
        <MacroBar label="Protein" value={protein} target={proteinTarget} color="#f97316" />
        <MacroBar label="Carbs" value={carbs} target={carbTarget} color="#3b82f6" />
        <MacroBar label="Fat" value={fat} target={fatTarget} color="#a855f7" />
      </div>
    </Link>
  );
}
