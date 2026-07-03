'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type LogEntry = {
  id: string;
  meal: string;
  foodName: string;
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
};

type NutritionResponse = { entries?: LogEntry[] };

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

export function CaloriesTodayCard() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const today = todayLocal();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/nutrition?date=${encodeURIComponent(today)}`)
      .then((r) => (r.ok ? r.json() : Promise.resolve({ entries: [] })))
      .then((data: NutritionResponse) => {
        if (!cancelled) setEntries(data.entries ?? []);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [today]);

  const totalProtein = entries.reduce((sum, e) => sum + (e.proteinG ?? 0), 0);

  const byMeal = entries.reduce<Record<string, { cal: number; items: number }>>((acc, e) => {
    const meal = e.meal || 'other';
    if (!acc[meal]) acc[meal] = { cal: 0, items: 0 };
    acc[meal].cal += e.calories ?? 0;
    acc[meal].items += 1;
    return acc;
  }, {});
  const mealOrder = ['breakfast', 'lunch', 'dinner', 'snacks'];
  const sortedMeals = mealOrder.filter((m) => byMeal[m]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-card p-5 sm:p-6">
        <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
          Meals today
        </h2>
        <p className="font-sans text-muted text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <Link
      href="/nutrition"
      className="bg-card border border-border rounded-card p-5 sm:p-6 block hover:border-accent/50 transition-colors h-full"
    >
      <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
        Meals today
      </h2>
      {entries.length === 0 ? (
        <p className="font-sans text-muted text-sm mb-2">No meals logged yet.</p>
      ) : (
        <>
          {totalProtein > 0 && (
            <p className="font-sans text-sm text-muted mb-3">{totalProtein}g protein logged</p>
          )}
          <div className="space-y-1.5">
            {sortedMeals.map((meal) => {
              const { cal, items } = byMeal[meal];
              const label = MEAL_LABELS[meal] ?? meal;
              return (
                <div key={meal} className="flex justify-between gap-2 font-sans text-sm">
                  <span className="text-text">{label}</span>
                  <span className="text-muted shrink-0">
                    {cal} cal{items > 1 ? ` · ${items} items` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
      <span className="font-sans text-sm text-accent hover:underline mt-3 inline-block">
        {entries.length === 0 ? 'Log meals' : 'View Nutrition'} →
      </span>
    </Link>
  );
}
