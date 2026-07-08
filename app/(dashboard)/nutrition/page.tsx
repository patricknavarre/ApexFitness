'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { IconScan } from '@/components/ui/icons';
import { ProteinShakeModal } from '@/components/nutrition/ProteinShakeModal';
import {
  detectsProteinShake,
  findShakeItemIndices,
  applyConfirmedProteinToItems,
  saveLastShakeProteinG,
} from '@/lib/protein-shake';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;
type Meal = (typeof MEALS)[number];

const MEAL_LABELS: Record<Meal, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

function defaultMealForTime(): Meal {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 20) return 'dinner';
  return 'snacks';
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function MacroBar({
  label,
  current,
  target,
  color = 'var(--accent3)',
}: {
  label: string;
  current: number;
  target: number | null;
  color?: string;
}) {
  const pct = target && target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-sans text-xs text-muted">{label}</span>
        <span className="font-mono text-sm text-text">
          {current}
          {target != null && <span className="text-muted"> / {target}</span>}
        </span>
      </div>
      {target != null && target > 0 && (
        <div className="h-1.5 rounded-full bg-bg3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      )}
    </div>
  );
}

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

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayISO(): string {
  return localDateKey(new Date());
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

type ShakeModalMode = 'pre-analyze' | 'post-analyze' | 'manual';

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
  const [historyDate, setHistoryDate] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<LogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [scanTargetMeal, setScanTargetMeal] = useState<Meal>(defaultMealForTime);
  const [showWeekChart, setShowWeekChart] = useState(false);
  const [scanDescription, setScanDescription] = useState('');
  const [shakeModalVisible, setShakeModalVisible] = useState(false);
  const [shakeProteinG, setShakeProteinG] = useState('');
  const [shakeModalMode, setShakeModalMode] = useState<ShakeModalMode>('pre-analyze');
  const [pendingManualMeal, setPendingManualMeal] = useState<Meal | null>(null);
  const pendingPostAnalyzeItemsRef = useRef<ScanItem[] | null>(null);

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
      dates.push(localDateKey(d));
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
              date: d,
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

  async function loadHistoryForDate(d: string) {
    setHistoryDate(d);
    // If the date is the currently selected date, reuse existing entries
    if (d === date) {
      setHistoryEntries(entries);
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/nutrition?date=${d}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setHistoryEntries(data.entries ?? []);
    } catch {
      toast.error('Could not load history for that day');
      setHistoryEntries([]);
    }
    setHistoryLoading(false);
  }

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

  async function saveManualEntry(
    meal: Meal,
    overrides?: { foodName?: string; calories?: number; proteinG?: number; carbsG?: number; fatG?: number }
  ) {
    const foodName = (overrides?.foodName ?? manualFood.trim()) || 'Unknown';
    const calories = overrides?.calories ?? Math.max(0, Number(manualCal) || 0);
    const proteinG = overrides?.proteinG ?? Math.max(0, Number(manualP) || 0);
    const carbsG = overrides?.carbsG ?? Math.max(0, Number(manualC) || 0);
    const fatG = overrides?.fatG ?? Math.max(0, Number(manualF) || 0);
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

  function handleManualSubmit(meal: Meal) {
    const foodName = manualFood.trim();
    if (detectsProteinShake(foodName) && (Number(manualP) || 0) === 0) {
      setPendingManualMeal(meal);
      setShakeModalMode('manual');
      setShakeProteinG('');
      setShakeModalVisible(true);
      return;
    }
    saveManualEntry(meal);
  }

  async function addManual(meal: Meal) {
    handleManualSubmit(meal);
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

  async function runFoodAnalysis(confirmedProteinG?: number) {
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
        body: JSON.stringify({
          image: scanImage,
          contextNote: scanDescription.trim() || undefined,
          confirmedProteinG,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ? `${data.error} (${data.detail})` : data.error || 'Analysis failed');
      const rawItems = Array.isArray(data.items) ? data.items : data.items == null && data.foodName != null
        ? [{ foodName: data.foodName ?? 'Unknown', estimatedCalories: data.estimatedCalories ?? 0, proteinG: data.proteinG ?? 0, carbsG: data.carbsG ?? 0, fatG: data.fatG ?? 0 }]
        : [];
      let items: ScanItem[] = rawItems.map((x: ScanItem) => ({
        foodName: x.foodName ?? 'Unknown',
        estimatedCalories: Math.max(0, Number(x.estimatedCalories) ?? 0),
        proteinG: Math.max(0, Number(x.proteinG) ?? 0),
        carbsG: Math.max(0, Number(x.carbsG) ?? 0),
        fatG: Math.max(0, Number(x.fatG) ?? 0),
      }));

      if (confirmedProteinG) {
        items = applyConfirmedProteinToItems(items, confirmedProteinG);
        setScanResult(items.length > 0 ? { items } : null);
        toast.success('Analysis complete');
      } else if (findShakeItemIndices(items).length > 0) {
        pendingPostAnalyzeItemsRef.current = items;
        setShakeModalMode('post-analyze');
        setShakeProteinG('');
        setShakeModalVisible(true);
      } else {
        setScanResult(items.length > 0 ? { items } : null);
        toast.success('Analysis complete');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Analysis failed');
    }
    setScanLoading(false);
  }

  function handleAnalyze() {
    if (!scanImage) {
      toast.error('Select a photo first');
      return;
    }
    if (detectsProteinShake(scanDescription)) {
      setShakeModalMode('pre-analyze');
      setShakeProteinG('');
      setShakeModalVisible(true);
      return;
    }
    runFoodAnalysis();
  }

  function handleShakeConfirm() {
    const grams = parseInt(shakeProteinG, 10);
    if (!grams || grams < 1 || grams > 300) return;

    saveLastShakeProteinG(grams);
    setShakeModalVisible(false);
    setShakeProteinG('');

    if (shakeModalMode === 'pre-analyze') {
      runFoodAnalysis(grams);
    } else if (shakeModalMode === 'post-analyze') {
      const pending = pendingPostAnalyzeItemsRef.current;
      if (pending) {
        const updated = applyConfirmedProteinToItems(pending, grams);
        setScanResult({ items: updated });
        pendingPostAnalyzeItemsRef.current = null;
        toast.success('Analysis complete');
      }
    } else if (shakeModalMode === 'manual' && pendingManualMeal) {
      setManualP(String(grams));
      saveManualEntry(pendingManualMeal, { proteinG: grams });
      setPendingManualMeal(null);
    }
  }

  function handleShakeCancel() {
    setShakeModalVisible(false);
    setShakeProteinG('');
    pendingPostAnalyzeItemsRef.current = null;
    setPendingManualMeal(null);
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
  const isToday = date === todayISO();

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header + date */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-accent uppercase tracking-wide">
            Nutrition
          </h1>
          <p className="font-sans text-muted mt-1 text-sm">
            Snap a photo — AI estimates calories and macros instantly.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={prevDay}
            aria-label="Previous day"
            className="bg-card border border-border rounded-card px-3 py-2 font-sans text-text hover:border-accent transition-colors"
          >
            ←
          </button>
          <div className="bg-card border border-border rounded-card px-3 py-2 text-center min-w-[9rem]">
            <p className="font-sans text-sm font-medium text-text leading-tight">
              {formatDisplayDate(date)}
            </p>
            {!isToday && (
              <button
                type="button"
                onClick={() => setDate(todayISO())}
                className="font-sans text-[10px] text-accent3 hover:underline mt-0.5"
              >
                Jump to today
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={nextDay}
            aria-label="Next day"
            className="bg-card border border-border rounded-card px-3 py-2 font-sans text-text hover:border-accent transition-colors"
          >
            →
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="sr-only"
            id="nutrition-date-picker"
          />
          <label
            htmlFor="nutrition-date-picker"
            className="bg-bg3 border border-border rounded-card px-3 py-2 font-sans text-xs text-muted hover:border-accent cursor-pointer transition-colors"
          >
            Pick
          </label>
        </div>
      </div>

      {/* Macro summary */}
      {loadingTargets ? (
        <p className="font-sans text-muted text-sm">Loading targets…</p>
      ) : targets && (targets.calorieTarget != null || targets.proteinTarget != null) ? (
        <div className="bg-card border border-border rounded-card p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <MacroBar label="Calories" current={totals.calories} target={targets.calorieTarget} />
          <MacroBar label="Protein (g)" current={totals.proteinG} target={targets.proteinTarget} color="var(--accent)" />
          <MacroBar label="Carbs (g)" current={totals.carbsG} target={targets.carbTarget} />
          <MacroBar label="Fat (g)" current={totals.fatG} target={targets.fatTarget} color="var(--accent2)" />
        </div>
      ) : (
        <p className="font-sans text-muted text-sm">
          Set calorie and macro targets in Settings to track progress.
        </p>
      )}

      {/* AI Scan hero */}
      <section className="relative overflow-hidden rounded-card border-2 border-accent3/40 bg-gradient-to-br from-accent3/10 via-card to-card p-5 sm:p-6 shadow-glow-accent3">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent3/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-accent3"><IconScan /></span>
            <h2 className="font-display text-xl text-accent3 uppercase tracking-wide">
              AI Food Scanner
            </h2>
          </div>
          <p className="font-sans text-sm text-muted mb-4">
            Take a photo of your meal and let AI estimate nutrition for you.
          </p>

          {!scanResult && (
            <div className="mb-4">
              <label htmlFor="scan-description" className="font-sans text-xs text-muted block mb-1.5">
                Describe extras (optional) — e.g. protein shake, whey scoop
              </label>
              <input
                id="scan-description"
                type="text"
                value={scanDescription}
                onChange={(e) => setScanDescription(e.target.value)}
                placeholder="What's in the photo?"
                className="w-full bg-bg3 border border-border rounded-card px-3 py-2.5 font-sans text-sm text-text focus:outline-none focus:border-accent3"
              />
            </div>
          )}

          {!scanPreview && !scanResult && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={openCameraForScan}
                className="flex-1 flex items-center justify-center gap-2 bg-accent3 text-black font-sans font-bold text-sm uppercase px-6 py-4 rounded-card hover:shadow-glow-accent3 transition-shadow"
              >
                <IconScan />
                Take photo
              </button>
              <button
                type="button"
                onClick={openLibraryForScan}
                className="flex-1 bg-bg3 border border-border text-text font-sans font-medium text-sm px-6 py-4 rounded-card hover:border-accent3 transition-colors"
              >
                Choose from library
              </button>
            </div>
          )}

          {(scanPreview || scanResult) && (
            <div className="space-y-4">
              {scanPreview && (
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="relative w-full sm:w-40 aspect-square rounded-card overflow-hidden bg-bg2 shrink-0 border border-border">
                    <Image
                      src={scanPreview}
                      alt="Food preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  {!scanResult && (
                    <div className="flex flex-col gap-2 flex-1">
                      <p className="font-sans text-sm text-text">Ready to analyze?</p>
                      <button
                        type="button"
                        onClick={handleAnalyze}
                        disabled={scanLoading || !scanImage}
                        className="bg-accent3 text-black font-sans font-bold uppercase text-sm px-6 py-3 rounded-card hover:shadow-glow-accent3 disabled:opacity-50 w-fit"
                      >
                        {scanLoading ? 'Analyzing…' : 'Analyze with AI'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScanPreview(null);
                          setScanImage(null);
                          setScanResult(null);
                          setScanDescription('');
                        }}
                        className="font-sans text-xs text-muted hover:text-text underline w-fit"
                      >
                        Retake photo
                      </button>
                    </div>
                  )}
                </div>
              )}

              {scanResult && (
                <div className="space-y-3">
                  <ul className="space-y-2">
                    {scanResult.items.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex flex-wrap items-center justify-between gap-2 bg-bg2/60 border border-border rounded-card px-3 py-2.5 font-sans text-sm"
                      >
                        <span className="font-medium text-text">{item.foodName}</span>
                        <span className="text-muted text-xs">
                          {item.estimatedCalories} cal · P{item.proteinG} C{item.carbsG} F{item.fatG}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <label htmlFor="scan-target-meal" className="font-sans text-sm text-muted">
                      Add to:
                    </label>
                    <select
                      id="scan-target-meal"
                      value={scanTargetMeal}
                      onChange={(e) => setScanTargetMeal(e.target.value as Meal)}
                      className="bg-bg3 border border-border text-text font-sans text-sm px-3 py-2 rounded-card focus:outline-none focus:border-accent3"
                    >
                      {MEALS.map((m) => (
                        <option key={m} value={m}>{MEAL_LABELS[m]}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => addAllScanToMeal(scanTargetMeal)}
                      disabled={addingScan}
                      className="bg-accent text-black font-sans font-bold text-sm uppercase px-4 py-2 rounded-card hover:shadow-glow disabled:opacity-50"
                    >
                      {addingScan ? 'Adding…' : `Add ${scanResult.items.length} item${scanResult.items.length > 1 ? 's' : ''}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScanResult(null);
                        setScanPreview(null);
                        setScanImage(null);
                      }}
                      className="font-sans text-xs text-muted hover:text-text underline"
                    >
                      Discard
                    </button>
                  </div>
                  <details className="font-sans text-xs text-muted">
                    <summary className="cursor-pointer hover:text-text">Add items individually</summary>
                    <ul className="mt-2 space-y-2">
                      {scanResult.items.map((item, idx) => (
                        <li key={idx} className="flex flex-wrap items-center gap-2">
                          <span className="text-text">{item.foodName}</span>
                          {MEALS.map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => addScanItemToMeal(m, item)}
                              disabled={addingScan}
                              className="bg-bg3 border border-border text-text text-xs px-2 py-0.5 rounded-card hover:border-accent disabled:opacity-50"
                            >
                              {MEAL_LABELS[m]}
                            </button>
                          ))}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Today's log */}
      <section>
        <h2 className="font-display text-lg text-accent uppercase tracking-wide mb-3">
          {isToday ? "Today's log" : `Log for ${formatDisplayDate(date)}`}
        </h2>
        {loadingLog ? (
          <p className="font-sans text-muted text-sm">Loading…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {MEALS.map((meal) => {
              const items = entriesByMeal(meal);
              const mealCal = items.reduce((s, e) => s + e.calories, 0);
              return (
                <div
                  key={meal}
                  className="bg-card border border-border rounded-card overflow-hidden flex flex-col"
                >
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg2/30">
                    <h3 className="font-display text-sm text-accent3 uppercase tracking-wide">
                      {MEAL_LABELS[meal]}
                    </h3>
                    {items.length > 0 && (
                      <span className="font-mono text-xs text-muted">{mealCal} cal</span>
                    )}
                  </div>
                  <div className="px-4 py-3 flex-1 space-y-2">
                    {items.length === 0 && addingMeal !== meal && (
                      <p className="font-sans text-xs text-muted italic">Nothing logged yet</p>
                    )}
                    {items.map((e) => (
                      <div key={e.id} className="group flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-sans text-sm text-text truncate">{e.foodName}</p>
                          <p className="font-sans text-xs text-muted">
                            {e.calories} cal · P{e.proteinG} C{e.carbsG} F{e.fatG}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteEntry(e.id)}
                          disabled={deletingId === e.id}
                          className="shrink-0 text-muted hover:text-accent2 text-xs opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                          aria-label={`Remove ${e.foodName}`}
                        >
                          {deletingId === e.id ? '…' : '×'}
                        </button>
                      </div>
                    ))}
                    {addingMeal === meal ? (
                      <div className="border border-border rounded-card p-3 space-y-2 bg-bg2/50 mt-2">
                        <input
                          type="text"
                          placeholder="Food name"
                          value={manualFood}
                          onChange={(e) => setManualFood(e.target.value)}
                          className="w-full bg-bg3 border border-border rounded-card px-3 py-2 text-text font-sans text-sm focus:ring-2 focus:ring-accent"
                        />
                        <div className="grid grid-cols-4 gap-1.5">
                          {(['Cal', 'P', 'C', 'F'] as const).map((label, i) => {
                            const vals = [manualCal, manualP, manualC, manualF];
                            const setters = [setManualCal, setManualP, setManualC, setManualF];
                            return (
                              <input
                                key={label}
                                type="number"
                                placeholder={label}
                                value={vals[i]}
                                onChange={(e) => setters[i](e.target.value)}
                                min={0}
                                className="bg-bg3 border border-border rounded-card px-2 py-1.5 text-text font-sans text-xs focus:ring-2 focus:ring-accent"
                              />
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => addManual(meal)}
                            className="bg-accent text-black font-sans font-bold text-xs uppercase px-3 py-1.5 rounded-card hover:shadow-glow"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingMeal(null)}
                            className="font-sans text-xs text-muted hover:text-text"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingMeal(meal)}
                        className="font-sans text-xs text-muted hover:text-accent3 transition-colors mt-1"
                      >
                        + Add manually
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Secondary: suggest + weekly */}
      <div className="grid gap-4 md:grid-cols-2">
        {targets && (targets.calorieTarget != null || targets.proteinTarget != null) && (
          <div className="bg-card border border-border rounded-card p-4">
            <h3 className="font-display text-sm text-accent uppercase tracking-wide mb-3">
              Suggest a meal
            </h3>
            <p className="font-sans text-xs text-muted mb-3">
              AI picks something based on your remaining macros.
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <select
                value={suggestMealType}
                onChange={(e) => setSuggestMealType(e.target.value as Meal)}
                className="bg-bg3 border border-border text-text font-sans text-sm px-3 py-2 rounded-card focus:outline-none focus:border-accent"
              >
                {MEALS.map((m) => (
                  <option key={m} value={m}>{MEAL_LABELS[m]}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={suggestMeal}
                disabled={suggestLoading}
                className="bg-bg3 border border-border text-text font-sans font-bold text-xs uppercase px-3 py-2 rounded-card hover:border-accent disabled:opacity-50"
              >
                {suggestLoading ? 'Thinking…' : 'Suggest'}
              </button>
            </div>
            {suggestResult && (
              <div className="bg-bg2/50 border border-border rounded-card p-3 space-y-2">
                <p className="font-sans text-sm text-text font-medium">{suggestResult.foodName}</p>
                <p className="font-sans text-xs text-muted">
                  {suggestResult.estimatedCalories} cal · P{suggestResult.proteinG} C{suggestResult.carbsG} F{suggestResult.fatG}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => addSuggestedToMeal(suggestMealType)}
                    disabled={addingScan}
                    className="bg-accent text-black font-sans text-xs font-bold uppercase px-3 py-1 rounded-card hover:shadow-glow disabled:opacity-50"
                  >
                    Add to {MEAL_LABELS[suggestMealType]}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuggestResult(null)}
                    className="font-sans text-xs text-muted hover:text-text"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-card border border-border rounded-card p-4">
          <button
            type="button"
            onClick={() => setShowWeekChart((v) => !v)}
            className="w-full flex items-center justify-between font-display text-sm text-accent uppercase tracking-wide"
          >
            Last 7 days
            <span className="text-muted text-xs font-sans normal-case">{showWeekChart ? 'Hide' : 'Show'}</span>
          </button>
          {showWeekChart && !loadingWeek && weeklyData.length > 0 && (
            <div className="h-40 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value: string) => value.slice(5)}
                    tick={{ fontSize: 10 }}
                    stroke="var(--muted)"
                  />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted)" width={32} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', fontSize: 12 }}
                    formatter={(value: number) => [value, 'cal']}
                    labelFormatter={(label) => String(label)}
                  />
                  <Bar
                    dataKey="calories"
                    fill="var(--accent3)"
                    radius={[3, 3, 0, 0]}
                    className="cursor-pointer"
                    onClick={(entry) => {
                      const d = (entry && (entry as { date?: string }).date) as string | undefined;
                      if (d) loadHistoryForDate(d);
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {showWeekChart && loadingWeek && (
            <p className="font-sans text-xs text-muted mt-3">Loading chart…</p>
          )}
        </div>
      </div>

      {historyDate && (
        <div className="bg-card border border-border rounded-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-accent3 uppercase tracking-wide">
              Meals on {formatDisplayDate(historyDate)}
            </h2>
            <button
              type="button"
              onClick={() => setHistoryDate(null)}
              className="font-sans text-xs text-muted hover:text-text"
            >
              Close
            </button>
          </div>
          {historyLoading ? (
            <p className="font-sans text-muted text-sm">Loading…</p>
          ) : historyEntries.length === 0 ? (
            <p className="font-sans text-muted text-sm">No meals logged on this day.</p>
          ) : (
            <div className="space-y-3">
              {MEALS.map((meal) => {
                const items = historyEntries.filter((e) => e.meal === meal);
                if (items.length === 0) return null;
                const totalCalories = items.reduce((s, e) => s + e.calories, 0);
                return (
                  <div key={meal}>
                    <h3 className="font-display text-sm text-accent uppercase tracking-wide mb-1">
                      {MEAL_LABELS[meal]}
                    </h3>
                    <ul className="space-y-1 font-sans text-sm text-text">
                      {items.map((e) => (
                        <li key={e.id} className="flex justify-between gap-2">
                          <span>{e.foodName}</span>
                          <span className="text-muted text-xs shrink-0">
                            {e.calories} cal
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="font-sans text-xs text-muted mt-1">
                      {totalCalories} cal total
                    </p>
                  </div>
                );
              })}
              <p className="font-sans text-xs text-muted border-t border-border pt-2">
                Day total: {historyEntries.reduce((s, e) => s + e.calories, 0)} cal
              </p>
            </div>
          )}
        </div>
      )}

      <ProteinShakeModal
        visible={shakeModalVisible}
        value={shakeProteinG}
        onChange={setShakeProteinG}
        onConfirm={handleShakeConfirm}
        onCancel={handleShakeCancel}
      />

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
    </div>
  );
}
