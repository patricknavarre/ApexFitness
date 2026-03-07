'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;
type Meal = (typeof MEALS)[number];

const JPEG_QUALITY = 0.92;
const MAX_LONG_EDGE = 1200;

function dataUrlToJpeg(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const long = Math.max(w, h);
      if (long > MAX_LONG_EDGE) {
        const scale = MAX_LONG_EDGE / long;
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        const jpeg = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        resolve(jpeg);
      } catch {
        reject(new Error('Could not convert to JPEG'));
      }
    };
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = dataUrl;
  });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

type LogEntry = {
  id: string;
  meal: Meal;
  foodName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

type Targets = {
  name: string | null;
  calorieTarget: number | null;
  proteinTarget: number | null;
  carbTarget: number | null;
  fatTarget: number | null;
};

type ScanItem = {
  foodName: string;
  estimatedCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

type ScanResult = {
  items: ScanItem[];
};

export default function NutritionPage() {
  const [date, setDate] = useState(todayISO);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [targets, setTargets] = useState<Targets | null>(null);
  const [loadingLog, setLoadingLog] = useState(true);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [addingMeal, setAddingMeal] = useState<Meal | null>(null);
  const [manualFood, setManualFood] = useState('');
  const [manualCal, setManualCal] = useState('');
  const [manualP, setManualP] = useState('');
  const [manualC, setManualC] = useState('');
  const [manualF, setManualF] = useState('');
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [addingScan, setAddingScan] = useState(false);
  const [weeklyData, setWeeklyData] = useState<{ date: string; calories: number; proteinG: number }[]>([]);
  const [loadingWeek, setLoadingWeek] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestResult, setSuggestResult] = useState<ScanItem | null>(null);
  const [suggestMealType, setSuggestMealType] = useState<Meal>('breakfast');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  /** Open camera capture. Must be synchronous so iOS Safari allows the file input to open (user gesture). */
  function openCameraForScan() {
    fileInputRef.current?.click();
  }

  function openLibraryForScan() {
    libraryInputRef.current?.click();
  }

  const fetchLog = useCallback(async () => {
    setLoadingLog(true);
    try {
      const res = await fetch(`/api/nutrition?date=${date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setEntries(data.entries ?? []);
    } catch (e) {
      toast.error('Could not load log');
      setEntries([]);
    }
    setLoadingLog(false);
  }, [date]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  useEffect(() => {
    let cancelled = false;
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    Promise.all(dates.map((d) => fetch(`/api/nutrition?date=${d}`).then((r) => r.json())))
      .then((results) => {
        if (cancelled) return;
        setWeeklyData(
          dates.map((d, i) => {
            const entries = results[i]?.entries ?? [];
            const calories = entries.reduce((s: number, e: LogEntry) => s + e.calories, 0);
            const proteinG = entries.reduce((s: number, e: LogEntry) => s + e.proteinG, 0);
            return {
              date: d.slice(5),
              calories,
              proteinG,
            };
          })
        );
      })
      .catch(() => {
        if (!cancelled) setWeeklyData([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingWeek(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entries]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingTargets(true);
      try {
        const res = await fetch('/api/user/me');
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || 'Failed');
        setTargets({
          name: data.name ?? null,
          calorieTarget: data.calorieTarget ?? null,
          proteinTarget: data.proteinTarget ?? null,
          carbTarget: data.carbTarget ?? null,
          fatTarget: data.fatTarget ?? null,
        });
      } catch {
        if (!cancelled) setTargets(null);
      }
      if (!cancelled) setLoadingTargets(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories ?? 0),
      proteinG: acc.proteinG + (e.proteinG ?? 0),
      carbsG: acc.carbsG + (e.carbsG ?? 0),
      fatG: acc.fatG + (e.fatG ?? 0),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  function prevDay() {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().slice(0, 10));
  }
  function nextDay() {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().slice(0, 10));
  }

  async function addManual(meal: Meal) {
    const foodName = manualFood.trim() || 'Unknown';
    const calories = Math.max(0, Number(manualCal) || 0);
    const proteinG = Math.max(0, Number(manualP) || 0);
    const carbsG = Math.max(0, Number(manualC) || 0);
    const fatG = Math.max(0, Number(manualF) || 0);
    try {
      const res = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logDate: date,
          meal,
          foodName,
          calories,
          proteinG,
          carbsG,
          fatG,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setEntries((prev) => [
        ...prev,
        {
          id: data.id,
          meal,
          foodName,
          calories,
          proteinG,
          carbsG,
          fatG,
        },
      ]);
      setAddingMeal(null);
      setManualFood('');
      setManualCal('');
      setManualP('');
      setManualC('');
      setManualF('');
      toast.success('Added');
    } catch {
      toast.error('Could not add entry');
    }
  }

  function handleScanFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setScanPreview(dataUrl);
      setScanResult(null);
      try {
        const jpeg = await dataUrlToJpeg(dataUrl);
        setScanImage(jpeg);
      } catch {
        toast.error('Could not process image');
        setScanImage(null);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (libraryInputRef.current) libraryInputRef.current.value = '';
  }

  async function handleAnalyze() {
    if (!scanImage) {
      toast.error('Select a photo first');
      return;
    }
    setScanLoading(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/nutrition/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: scanImage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      const rawItems = Array.isArray(data.items) ? data.items : data.items == null && data.foodName != null
        ? [{ foodName: data.foodName ?? 'Unknown', estimatedCalories: data.estimatedCalories ?? 0, proteinG: data.proteinG ?? 0, carbsG: data.carbsG ?? 0, fatG: data.fatG ?? 0 }]
        : [];
      const items: ScanItem[] = rawItems.map((x: ScanItem) => ({
        foodName: x.foodName ?? 'Unknown',
        estimatedCalories: Math.max(0, Number(x.estimatedCalories) ?? 0),
        proteinG: Math.max(0, Number(x.proteinG) ?? 0),
        carbsG: Math.max(0, Number(x.carbsG) ?? 0),
        fatG: Math.max(0, Number(x.fatG) ?? 0),
      }));
      setScanResult(items.length > 0 ? { items } : null);
      toast.success('Analysis complete');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Analysis failed');
    }
    setScanLoading(false);
  }

  async function addScanItemToMeal(meal: Meal, item: ScanItem) {
    setAddingScan(true);
    try {
      const res = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logDate: date,
          meal,
          foodName: item.foodName,
          calories: item.estimatedCalories,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setEntries((prev) => [
        ...prev,
        {
          id: data.id,
          meal,
          foodName: item.foodName,
          calories: item.estimatedCalories,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
        },
      ]);
      setScanResult((prev) => {
        if (!prev || prev.items.length <= 1) return null;
        const next = prev.items.filter((i) => i !== item);
        return next.length > 0 ? { items: next } : null;
      });
      if (!scanResult || scanResult.items.length <= 1) {
        setScanPreview(null);
        setScanImage(null);
      }
      toast.success(`Added ${item.foodName} to ${meal}`);
    } catch {
      toast.error('Could not add to log');
    }
    setAddingScan(false);
  }

  async function addAllScanToMeal(meal: Meal) {
    if (!scanResult?.items?.length) return;
    setAddingScan(true);
    try {
      for (const item of scanResult.items) {
        const res = await fetch('/api/nutrition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            logDate: date,
            meal,
            foodName: item.foodName,
            calories: item.estimatedCalories,
            proteinG: item.proteinG,
            carbsG: item.carbsG,
            fatG: item.fatG,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        setEntries((prev) => [
          ...prev,
          {
            id: data.id,
            meal,
            foodName: item.foodName,
            calories: item.estimatedCalories,
            proteinG: item.proteinG,
            carbsG: item.carbsG,
            fatG: item.fatG,
          },
        ]);
      }
      setScanResult(null);
      setScanPreview(null);
      setScanImage(null);
      toast.success(`Added ${scanResult.items.length} items to ${meal}`);
    } catch {
      toast.error('Could not add some items');
    }
    setAddingScan(false);
  }

  const remaining = {
    calories: Math.max(0, (targets?.calorieTarget ?? 0) - totals.calories),
    proteinG: Math.max(0, (targets?.proteinTarget ?? 0) - totals.proteinG),
    carbsG: Math.max(0, (targets?.carbTarget ?? 0) - totals.carbsG),
    fatG: Math.max(0, (targets?.fatTarget ?? 0) - totals.fatG),
  };

  async function suggestMeal() {
    setSuggestLoading(true);
    setSuggestResult(null);
    try {
      const res = await fetch('/api/nutrition/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remainingCalories: remaining.calories,
          remainingProteinG: remaining.proteinG,
          remainingCarbsG: remaining.carbsG,
          remainingFatG: remaining.fatG,
          mealType: suggestMealType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Suggest failed');
      setSuggestResult({
        foodName: data.foodName ?? 'Suggested',
        estimatedCalories: data.estimatedCalories ?? 0,
        proteinG: data.proteinG ?? 0,
        carbsG: data.carbsG ?? 0,
        fatG: data.fatG ?? 0,
      });
      toast.success('Got a suggestion');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Suggest failed');
    }
    setSuggestLoading(false);
  }

  async function addSuggestedToMeal(meal: Meal) {
    if (!suggestResult) return;
    setAddingScan(true);
    try {
      const res = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logDate: date,
          meal,
          foodName: suggestResult.foodName,
          calories: suggestResult.estimatedCalories,
          proteinG: suggestResult.proteinG,
          carbsG: suggestResult.carbsG,
          fatG: suggestResult.fatG,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setEntries((prev) => [
        ...prev,
        {
          id: data.id,
          meal,
          foodName: suggestResult.foodName,
          calories: suggestResult.estimatedCalories,
          proteinG: suggestResult.proteinG,
          carbsG: suggestResult.carbsG,
          fatG: suggestResult.fatG,
        },
      ]);
      setSuggestResult(null);
      toast.success(`Added to ${meal}`);
    } catch {
      toast.error('Could not add');
    }
    setAddingScan(false);
  }

  async function deleteEntry(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/nutrition?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success('Entry removed');
    } catch {
      toast.error('Could not remove entry');
    }
    setDeletingId(null);
  }

  const entriesByMeal = (meal: Meal) => entries.filter((e) => e.meal === meal);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl text-accent uppercase tracking-wide">
          Nutrition
        </h1>
        <p className="font-sans text-muted mt-2">
          Log your meals and track calories and macros. Add items manually or scan a photo with AI.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={prevDay}
          className="bg-card border border-border rounded-card px-4 py-2 font-sans text-text hover:border-accent transition-colors"
        >
          ← Prev
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-card border border-border rounded-card px-4 py-2 font-sans text-text focus:ring-2 focus:ring-accent"
        />
        <button
          type="button"
          onClick={nextDay}
          className="bg-card border border-border rounded-card px-4 py-2 font-sans text-text hover:border-accent transition-colors"
        >
          Next →
        </button>
      </div>

      {loadingTargets ? (
        <p className="font-sans text-muted">Loading targets…</p>
      ) : targets && (targets.calorieTarget != null || targets.proteinTarget != null) ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-sans">
          <div className="bg-card border border-border rounded-card p-4">
            <span className="text-muted text-sm block">Calories</span>
            <span className="text-accent3 font-mono">
              {totals.calories} / {targets.calorieTarget ?? '—'}
            </span>
          </div>
          <div className="bg-card border border-border rounded-card p-4">
            <span className="text-muted text-sm block">Protein (g)</span>
            <span className="text-accent3 font-mono">
              {totals.proteinG} / {targets.proteinTarget ?? '—'}
            </span>
          </div>
          <div className="bg-card border border-border rounded-card p-4">
            <span className="text-muted text-sm block">Carbs (g)</span>
            <span className="text-accent3 font-mono">
              {totals.carbsG} / {targets.carbTarget ?? '—'}
            </span>
          </div>
          <div className="bg-card border border-border rounded-card p-4">
            <span className="text-muted text-sm block">Fat (g)</span>
            <span className="text-accent3 font-mono">
              {totals.fatG} / {targets.fatTarget ?? '—'}
            </span>
          </div>
        </div>
      ) : (
        <p className="font-sans text-muted text-sm">
          Set your calorie and macro targets in Settings to see progress here.
        </p>
      )}

      {targets && (targets.calorieTarget != null || targets.proteinTarget != null) && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="nutrition-suggest-meal-type" className="font-sans text-sm text-muted">
            For:
          </label>
          <select
            id="nutrition-suggest-meal-type"
            value={suggestMealType}
            onChange={(e) => setSuggestMealType(e.target.value as Meal)}
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
            className="bg-bg3 border border-border text-text font-sans font-bold text-sm uppercase px-4 py-2 rounded-card hover:border-accent disabled:opacity-50"
          >
            {suggestLoading ? 'Suggesting…' : 'Suggest a meal'}
          </button>
          {suggestResult && (
            <div className="flex flex-wrap items-center gap-2 font-sans text-sm">
              <span className="text-text">
                {suggestResult.foodName} — {suggestResult.estimatedCalories} cal
              </span>
              {MEALS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => addSuggestedToMeal(m)}
                  disabled={addingScan}
                  className="bg-accent text-black font-sans text-xs font-bold uppercase px-2 py-1 rounded-card hover:shadow-glow disabled:opacity-50"
                >
                  Add to {m}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSuggestResult(null)}
                className="text-muted text-xs underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {!loadingWeek && weeklyData.length > 0 && (
        <div className="bg-card border border-border rounded-card p-6">
          <h2 className="font-display text-lg text-accent3 uppercase tracking-wide mb-4">
            Last 7 days
          </h2>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted)" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                  formatter={(value: number) => [value, 'cal']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Bar dataKey="calories" fill="var(--accent3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {loadingLog ? (
        <p className="font-sans text-muted">Loading log…</p>
      ) : (
        <div className="space-y-6">
          {MEALS.map((meal) => (
            <div
              key={meal}
              className="bg-card border border-border rounded-card overflow-hidden"
            >
              <h2 className="font-display text-lg text-accent3 uppercase tracking-wide px-5 py-3 border-b border-border">
                {meal}
              </h2>
              <div className="px-5 py-4 space-y-3">
                {entriesByMeal(meal).map((e) => (
                  <div
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-2 font-sans text-sm text-text"
                  >
                    <span className="font-medium">{e.foodName}</span>
                    <span className="text-muted">
                      {e.calories} cal · P {e.proteinG} / C {e.carbsG} / F {e.fatG} g
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteEntry(e.id)}
                      disabled={deletingId === e.id}
                      className="text-muted hover:text-accent2 text-xs underline disabled:opacity-50"
                    >
                      {deletingId === e.id ? '…' : 'Remove'}
                    </button>
                  </div>
                ))}
                {addingMeal === meal ? (
                  <div className="border border-border rounded-card p-4 space-y-3 bg-bg2">
                    <input
                      type="text"
                      placeholder="Food name"
                      value={manualFood}
                      onChange={(e) => setManualFood(e.target.value)}
                      className="w-full bg-bg3 border border-border rounded-card px-3 py-2 text-text font-sans text-sm focus:ring-2 focus:ring-accent"
                    />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <input
                        type="number"
                        placeholder="Cal"
                        value={manualCal}
                        onChange={(e) => setManualCal(e.target.value)}
                        min={0}
                        className="bg-bg3 border border-border rounded-card px-3 py-2 text-text font-sans text-sm focus:ring-2 focus:ring-accent"
                      />
                      <input
                        type="number"
                        placeholder="P (g)"
                        value={manualP}
                        onChange={(e) => setManualP(e.target.value)}
                        min={0}
                        className="bg-bg3 border border-border rounded-card px-3 py-2 text-text font-sans text-sm focus:ring-2 focus:ring-accent"
                      />
                      <input
                        type="number"
                        placeholder="C (g)"
                        value={manualC}
                        onChange={(e) => setManualC(e.target.value)}
                        min={0}
                        className="bg-bg3 border border-border rounded-card px-3 py-2 text-text font-sans text-sm focus:ring-2 focus:ring-accent"
                      />
                      <input
                        type="number"
                        placeholder="F (g)"
                        value={manualF}
                        onChange={(e) => setManualF(e.target.value)}
                        min={0}
                        className="bg-bg3 border border-border rounded-card px-3 py-2 text-text font-sans text-sm focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => addManual(meal)}
                        className="bg-accent text-black font-sans font-bold text-sm uppercase px-4 py-2 rounded-card hover:shadow-glow"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingMeal(null)}
                        className="bg-bg3 border border-border text-text font-sans text-sm px-4 py-2 rounded-card hover:border-accent"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAddingMeal(meal)}
                      className="text-accent3 font-sans text-sm font-medium hover:underline"
                    >
                      + Add manually
                    </button>
                    <button
                      type="button"
                      onClick={openCameraForScan}
                      className="text-accent font-sans text-sm font-medium hover:underline"
                    >
                      Scan with AI
                    </button>
                    <button
                      type="button"
                      onClick={openLibraryForScan}
                      className="text-muted font-sans text-sm hover:underline"
                    >
                      or choose from library
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleScanFile}
        className="hidden"
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        onChange={handleScanFile}
        className="hidden"
      />

      {(scanPreview || scanResult) && (
        <div className="bg-card border border-border rounded-card p-6 space-y-4">
          <h3 className="font-display text-lg text-accent uppercase tracking-wide">
            Scan with AI
          </h3>
          {scanPreview && (
            <div className="relative w-full max-w-sm aspect-square rounded-card overflow-hidden bg-bg2">
              <Image
                src={scanPreview}
                alt="Food preview"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}
          {!scanResult ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={scanLoading || !scanImage}
                className="bg-accent text-black font-sans font-bold uppercase px-6 py-3 rounded-card hover:shadow-glow disabled:opacity-50"
              >
                {scanLoading ? 'Analyzing…' : 'Analyze photo'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setScanPreview(null);
                  setScanImage(null);
                  setScanResult(null);
                }}
                className="text-muted font-sans text-sm underline hover:text-text"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <ul className="space-y-2 font-sans text-sm">
                {scanResult.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border last:border-0"
                  >
                    <span className="font-medium text-text">{item.foodName}</span>
                    <span className="text-muted">
                      {item.estimatedCalories} cal · P {item.proteinG} / C {item.carbsG} / F {item.fatG} g
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {MEALS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => addScanItemToMeal(m, item)}
                          disabled={addingScan}
                          className="bg-bg3 border border-border text-text font-sans text-xs px-2 py-1 rounded-card hover:border-accent disabled:opacity-50"
                        >
                          Add to {m}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                <span className="text-muted text-sm">Total:</span>
                <span className="font-mono text-accent3 text-sm">
                  {scanResult.items.reduce((s, i) => s + i.estimatedCalories, 0)} cal · P{' '}
                  {scanResult.items.reduce((s, i) => s + i.proteinG, 0)} / C{' '}
                  {scanResult.items.reduce((s, i) => s + i.carbsG, 0)} / F{' '}
                  {scanResult.items.reduce((s, i) => s + i.fatG, 0)} g
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted text-sm">Add all to:</span>
                {MEALS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => addAllScanToMeal(m)}
                    disabled={addingScan}
                    className="bg-accent text-black font-sans font-bold text-sm uppercase px-3 py-1.5 rounded-card hover:shadow-glow disabled:opacity-50"
                  >
                    {m}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setScanResult(null);
                    setScanPreview(null);
                    setScanImage(null);
                  }}
                  className="text-muted font-sans text-sm underline hover:text-text"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
