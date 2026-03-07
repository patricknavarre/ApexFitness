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

type UserMeResponse = { calorieTarget?: number | null };

type NutritionResponse = { entries?: LogEntry[] };

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

export function CaloriesTodayCard() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [calorieTarget, setCalorieTarget] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const today = todayLocal();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/nutrition?date=${encodeURIComponent(today)}`).then((r) =>
        r.ok ? r.json() : Promise.resolve({ entries: [] })
      ),
      fetch('/api/user/me').then((r) => (r.ok ? r.json() : Promise.resolve({}))),
    ])
      .then(([nutritionData, userData]: [NutritionResponse, UserMeResponse]) => {
        if (cancelled) return;
        setEntries(nutritionData.entries ?? []);
        setCalorieTarget(
          typeof userData.calorieTarget === 'number' ? userData.calorieTarget : null
        );
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

  const totalCal = entries.reduce((sum, e) => sum + (e.calories ?? 0), 0);
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
      <div className="bg-card border border-border rounded-card p-6">
        <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
          Calories today
        </h2>
        <p className="font-sans text-muted text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <Link
      href="/nutrition"
      className="bg-card border border-border rounded-card p-6 block hover:border-accent/50 transition-colors"
    >
      <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
        Calories today
      </h2>
      {entries.length === 0 ? (
        <p className="font-sans text-muted text-sm mb-2">No meals logged today.</p>
      ) : (
        <>
          <p className="font-mono text-accent3 text-lg">
            {totalCal}
            {calorieTarget != null && (
              <span className="font-sans text-muted text-sm font-normal">
                {' '}
                / {calorieTarget} cal
              </span>
            )}
          </p>
          {totalProtein > 0 && (
            <p className="font-sans text-sm text-muted mt-0.5">{totalProtein}g protein</p>
          )}
          <div className="mt-3 space-y-1">
            {sortedMeals.map((meal) => {
              const { cal, items } = byMeal[meal];
              const label = MEAL_LABELS[meal] ?? meal;
              return (
                <p key={meal} className="font-sans text-sm text-text">
                  {label}: {cal} cal{items > 1 ? ` (${items} items)` : ''}
                </p>
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
