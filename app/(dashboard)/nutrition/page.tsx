'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';

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

type ScanResult = {
  foodName: string;
  estimatedCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setScanResult({
        foodName: data.foodName ?? 'Unknown',
        estimatedCalories: data.estimatedCalories ?? 0,
        proteinG: data.proteinG ?? 0,
        carbsG: data.carbsG ?? 0,
        fatG: data.fatG ?? 0,
      });
      toast.success('Analysis complete');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Analysis failed');
    }
    setScanLoading(false);
  }

  async function addScanToMeal(meal: Meal) {
    if (!scanResult) return;
    setAddingScan(true);
    try {
      const res = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logDate: date,
          meal,
          foodName: scanResult.foodName,
          calories: scanResult.estimatedCalories,
          proteinG: scanResult.proteinG,
          carbsG: scanResult.carbsG,
          fatG: scanResult.fatG,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setEntries((prev) => [
        ...prev,
        {
          id: data.id,
          meal,
          foodName: scanResult.foodName,
          calories: scanResult.estimatedCalories,
          proteinG: scanResult.proteinG,
          carbsG: scanResult.carbsG,
          fatG: scanResult.fatG,
        },
      ]);
      setScanResult(null);
      setScanPreview(null);
      setScanImage(null);
      toast.success(`Added to ${meal}`);
    } catch {
      toast.error('Could not add to log');
    }
    setAddingScan(false);
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
                      onClick={() => fileInputRef.current?.click()}
                      className="text-accent font-sans text-sm font-medium hover:underline"
                    >
                      Scan with AI
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
              <div className="font-sans text-text">
                <span className="font-medium">{scanResult.foodName}</span>
                <span className="text-muted ml-2">
                  {scanResult.estimatedCalories} cal · P {scanResult.proteinG} / C {scanResult.carbsG} / F {scanResult.fatG} g
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted text-sm">Add to:</span>
                {MEALS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => addScanToMeal(m)}
                    disabled={addingScan}
                    className="bg-bg3 border border-border text-text font-sans text-sm px-3 py-1.5 rounded-card hover:border-accent disabled:opacity-50"
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
