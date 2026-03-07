'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;
type Meal = (typeof MEALS)[number];

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type Targets = {
  calorieTarget: number | null;
  proteinTarget: number | null;
  carbTarget: number | null;
  fatTarget: number | null;
};

type UserMeResponse = {
  calorieTarget?: number | null;
  proteinTarget?: number | null;
  carbTarget?: number | null;
  fatTarget?: number | null;
};

type NutritionResponse = { entries?: LogEntry[] };

type LogEntry = {
  id: string;
  meal: Meal;
  foodName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

type Suggestion = {
  foodName: string;
  estimatedCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

function hasTargets(t: Targets | null): boolean {
  if (!t) return false;
  return (
    (t.calorieTarget != null && t.calorieTarget > 0) ||
    (t.proteinTarget != null && t.proteinTarget > 0) ||
    (t.carbTarget != null && t.carbTarget > 0) ||
    (t.fatTarget != null && t.fatTarget > 0)
  );
}

export function SuggestMealCard() {
  const [targets, setTargets] = useState<Targets | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [addingTo, setAddingTo] = useState<Meal | null>(null);
  const [mealType, setMealType] = useState<Meal>('breakfast');

  const today = todayLocal();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/user/me').then((r) => (r.ok ? r.json() : Promise.resolve({}))),
      fetch(`/api/nutrition?date=${encodeURIComponent(today)}`).then((r) =>
        r.ok ? r.json() : Promise.resolve({ entries: [] })
      ),
    ])
      .then(([userData, nutritionData]: [UserMeResponse, NutritionResponse]) => {
        if (cancelled) return;
        setTargets({
          calorieTarget: userData.calorieTarget ?? null,
          proteinTarget: userData.proteinTarget ?? null,
          carbTarget: userData.carbTarget ?? null,
          fatTarget: userData.fatTarget ?? null,
        });
        setEntries(nutritionData.entries ?? []);
      })
      .catch(() => {
        if (!cancelled) setTargets(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [today]);

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories ?? 0),
      proteinG: acc.proteinG + (e.proteinG ?? 0),
      carbsG: acc.carbsG + (e.carbsG ?? 0),
      fatG: acc.fatG + (e.fatG ?? 0),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  const remaining = {
    calories: Math.max(0, (targets?.calorieTarget ?? 0) - totals.calories),
    proteinG: Math.max(0, (targets?.proteinTarget ?? 0) - totals.proteinG),
    carbsG: Math.max(0, (targets?.carbTarget ?? 0) - totals.carbsG),
    fatG: Math.max(0, (targets?.fatTarget ?? 0) - totals.fatG),
  };

  async function suggestMeal() {
    setSuggestError(null);
    setSuggestLoading(true);
    setSuggestion(null);
    try {
      const res = await fetch('/api/nutrition/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remainingCalories: remaining.calories,
          remainingProteinG: remaining.proteinG,
          remainingCarbsG: remaining.carbsG,
          remainingFatG: remaining.fatG,
          mealType,
        }),
      });
      const data = await res.json();
      if (res.status === 503) {
        setSuggestError(data.error ?? 'AI not configured.');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Suggest failed');
      setSuggestion({
        foodName: data.foodName ?? 'Suggested',
        estimatedCalories: data.estimatedCalories ?? 0,
        proteinG: data.proteinG ?? 0,
        carbsG: data.carbsG ?? 0,
        fatG: data.fatG ?? 0,
      });
      toast.success('Got a suggestion');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Suggest failed');
    } finally {
      setSuggestLoading(false);
    }
  }

  async function addToMeal(meal: Meal) {
    if (!suggestion) return;
    setAddingTo(meal);
    try {
      const res = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logDate: today,
          meal,
          foodName: suggestion.foodName,
          calories: suggestion.estimatedCalories,
          proteinG: suggestion.proteinG,
          carbsG: suggestion.carbsG,
          fatG: suggestion.fatG,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setEntries((prev) => [
        ...prev,
        {
          id: data.id,
          meal,
          foodName: suggestion.foodName,
          calories: suggestion.estimatedCalories,
          proteinG: suggestion.proteinG,
          carbsG: suggestion.carbsG,
          fatG: suggestion.fatG,
        },
      ]);
      setSuggestion(null);
      toast.success(`Added to ${meal}`);
    } catch {
      toast.error('Could not add');
    } finally {
      setAddingTo(null);
    }
  }

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-card p-6">
        <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
          Suggest a meal
        </h2>
        <p className="font-sans text-muted text-sm">Loading…</p>
      </div>
    );
  }

  if (!hasTargets(targets)) {
    return (
      <div className="bg-card border border-border rounded-card p-6">
        <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
          Suggest a meal
        </h2>
        <p className="font-sans text-muted text-sm mb-3">
          Set nutrition targets in Settings to get meal suggestions.
        </p>
        <Link
          href="/settings"
          className="font-sans text-sm text-accent hover:underline inline-block"
        >
          Go to Settings →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-card p-6">
      <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-2">
        Suggest a meal
      </h2>
      <p className="font-sans text-muted text-sm mb-2">
        Remaining today: {remaining.calories} cal, {remaining.proteinG}g P,{' '}
        {remaining.carbsG}g C, {remaining.fatG}g F
      </p>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label htmlFor="suggest-meal-type" className="font-sans text-sm text-muted">
          For:
        </label>
        <select
          id="suggest-meal-type"
          value={mealType}
          onChange={(e) => setMealType(e.target.value as Meal)}
          className="bg-bg3 border border-border text-text font-sans text-sm px-3 py-2 rounded-card focus:outline-none focus:border-accent"
        >
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snacks">Snack</option>
        </select>
        <button
          type="button"
          onClick={suggestMeal}
          disabled={suggestLoading}
          className="bg-accent text-black font-sans font-bold text-sm uppercase px-4 py-2 rounded-card hover:shadow-glow disabled:opacity-50"
        >
          {suggestLoading ? 'Suggesting…' : 'Suggest a meal'}
        </button>
      </div>
      {suggestError && (
        <p className="font-sans text-sm text-accent2 mb-2">{suggestError}</p>
      )}
      {suggestion && (
        <div className="border-t border-border pt-4 space-y-2">
          <p className="font-sans font-medium text-text">
            {suggestion.foodName} — {suggestion.estimatedCalories} cal,{' '}
            {suggestion.proteinG}g P / {suggestion.carbsG}g C / {suggestion.fatG}g F
          </p>
          <div className="flex flex-wrap gap-2">
            {MEALS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => addToMeal(m)}
                disabled={addingTo !== null}
                className="bg-bg3 border border-border text-text font-sans text-sm px-3 py-1.5 rounded-card hover:border-accent disabled:opacity-50 capitalize"
              >
                {addingTo === m ? 'Adding…' : `Add to ${m}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
