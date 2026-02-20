'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';

const DRAFT_KEY = 'apex-analysis-draft';

const GOALS = ['lose fat', 'build muscle', 'maintain', 'improve performance'];
const FITNESS_LEVELS = ['beginner', 'intermediate', 'advanced'];
const EQUIPMENT = ['none', 'bodyweight', 'dumbbells', 'full gym', 'home gym'];

const JPEG_QUALITY = 0.92;

/** Convert any image data URL to JPEG via canvas so the API always receives JPEG. */
function dataUrlToJpeg(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0);
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

type AnalysisResult = {
  bodyType: string;
  estimatedBodyFatRange: string;
  visibleStrengths: string[];
  areasToFocus: string[];
  postureObservations: string;
  fitnessLevelEstimate: string;
  summary: string;
  recommendedSplit: string;
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  analysisId?: string;
  photoUrl?: string;
  thumbUrl?: string;
};

const defaultContext = {
  goal: '',
  fitnessLevel: '',
  equipment: '',
  daysPerWeek: 5,
  injuries: '',
};

type Draft = {
  imageBase64: string | null;
  result: AnalysisResult | null;
  context: typeof defaultContext;
};

function loadDraft(): Draft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (!d || typeof d !== 'object') return null;
    return {
      imageBase64: d.imageBase64 && typeof d.imageBase64 === 'string' ? d.imageBase64 : null,
      result: d.result && typeof d.result === 'object' ? d.result : null,
      context: {
        goal: typeof d.context?.goal === 'string' ? d.context.goal : defaultContext.goal,
        fitnessLevel: typeof d.context?.fitnessLevel === 'string' ? d.context.fitnessLevel : defaultContext.fitnessLevel,
        equipment: typeof d.context?.equipment === 'string' ? d.context.equipment : defaultContext.equipment,
        daysPerWeek: typeof d.context?.daysPerWeek === 'number' ? d.context.daysPerWeek : defaultContext.daysPerWeek,
        injuries: typeof d.context?.injuries === 'string' ? d.context.injuries : defaultContext.injuries,
      },
    };
  } catch {
    return null;
  }
}

export default function AnalysisPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [context, setContext] = useState(defaultContext);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore draft from session when returning to the page
  useEffect(() => {
    const draft = loadDraft();
    if (!draft) return;
    if (draft.imageBase64) {
      setPreview(draft.imageBase64);
      setImageBase64(draft.imageBase64);
    }
    if (draft.result) setResult(draft.result);
    setContext(draft.context);
  }, []);

  // Persist draft so it survives navigation
  useEffect(() => {
    const draft: Draft = { imageBase64, result, context };
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // sessionStorage full or unavailable
    }
  }, [imageBase64, result, context]);

  function handleClear() {
    setPreview(null);
    setImageBase64(null);
    setResult(null);
    setContext(defaultContext);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
    setPreview(dataUrl);
    setResult(null);
    const isJpeg = dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg');
    if (isJpeg) {
      setImageBase64(dataUrl);
      return;
    }
    try {
      const jpegDataUrl = await dataUrlToJpeg(dataUrl);
      setImageBase64(jpegDataUrl);
    } catch {
      toast.error('Please use JPEG, PNG, or WebP. HEIC and some formats are not supported.');
      setImageBase64(null);
    }
  }

  async function handleAnalyze() {
    if (!imageBase64) {
      toast.error('Please upload a photo first.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          userContext: context,
          saveToProgress: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || 'Analysis failed';
        toast.error(data.detail ? `${msg} (${data.detail})` : msg);
        setLoading(false);
        return;
      }
      setResult(data);
      toast.success('Analysis complete');
    } catch {
      toast.error('Something went wrong');
    }
    setLoading(false);
  }

  async function handleSaveToProgress() {
    if (!imageBase64 || !result) return;
    setSaving(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          userContext: context,
          saveToProgress: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || 'Save failed';
        toast.error(data.detail ? `${msg} (${data.detail})` : msg);
        setSaving(false);
        return;
      }
      setResult((prev) => (prev ? { ...prev, ...data } : null));
      toast.success('Saved to Progress timeline');
    } catch {
      toast.error('Something went wrong');
    }
    setSaving(false);
  }

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="font-display text-3xl text-accent uppercase tracking-wide">
        AI Body Analysis
      </h1>

      {!result ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-card p-8 text-center cursor-pointer hover:border-accent3 transition-colors min-h-[280px] flex flex-col items-center justify-center"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFile}
                  className="hidden"
                />
                {preview ? (
                  <div className="relative w-full aspect-[3/4] max-h-[320px] rounded-card overflow-hidden bg-bg2">
                    <Image
                      src={preview}
                      alt="Preview"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  <>
                    <span className="text-accent3 font-mono text-sm uppercase tracking-wider block mb-2">
                      Take or upload a photo
                    </span>
                    <p className="font-sans text-muted text-sm">
                      Click or tap to select an image
                    </p>
                  </>
                )}
              </div>
              <p className="font-sans text-muted text-xs mt-3">
                Your photo is analyzed in real-time and never stored unless you choose to save it
                to your Progress timeline.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block font-sans text-sm text-muted">Current goal</label>
              <select
                value={context.goal}
                onChange={(e) => setContext((c) => ({ ...c, goal: e.target.value }))}
                className="w-full bg-card border border-border rounded-card px-4 py-3 text-text font-sans focus:ring-2 focus:ring-accent"
              >
                <option value="">—</option>
                {GOALS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <label className="block font-sans text-sm text-muted">Fitness level</label>
              <select
                value={context.fitnessLevel}
                onChange={(e) => setContext((c) => ({ ...c, fitnessLevel: e.target.value }))}
                className="w-full bg-card border border-border rounded-card px-4 py-3 text-text font-sans focus:ring-2 focus:ring-accent"
              >
                <option value="">—</option>
                {FITNESS_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>

              <label className="block font-sans text-sm text-muted">Available equipment</label>
              <select
                value={context.equipment}
                onChange={(e) => setContext((c) => ({ ...c, equipment: e.target.value }))}
                className="w-full bg-card border border-border rounded-card px-4 py-3 text-text font-sans focus:ring-2 focus:ring-accent"
              >
                <option value="">—</option>
                {EQUIPMENT.map((eq) => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>

              <label className="block font-sans text-sm text-muted">
                Days per week to train: {context.daysPerWeek}
              </label>
              <input
                type="range"
                min={1}
                max={7}
                value={context.daysPerWeek}
                onChange={(e) =>
                  setContext((c) => ({ ...c, daysPerWeek: Number(e.target.value) }))
                }
                className="w-full accent-accent"
              />

              <label className="block font-sans text-sm text-muted">Injuries or limitations (optional)</label>
              <textarea
                value={context.injuries}
                onChange={(e) => setContext((c) => ({ ...c, injuries: e.target.value }))}
                placeholder="e.g. lower back, knee"
                rows={2}
                className="w-full bg-card border border-border rounded-card px-4 py-3 text-text font-sans focus:ring-2 focus:ring-accent resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleAnalyze}
              disabled={loading || !imageBase64}
              className="bg-accent text-black font-sans font-bold uppercase px-8 py-4 rounded-card hover:shadow-glow transition-shadow disabled:opacity-50"
            >
              {loading ? 'Analyzing…' : 'Analyze photo'}
            </button>
            {(preview || result) && (
              <button
                type="button"
                onClick={handleClear}
                className="text-text-muted hover:text-text font-sans text-sm underline"
              >
                Clear & start over
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-card p-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-bg3 text-accent font-mono text-sm px-3 py-1 rounded-card">
                {result.bodyType}
              </span>
              <span className="bg-bg3 text-accent3 font-mono text-sm px-3 py-1 rounded-card">
                {result.recommendedSplit}
              </span>
            </div>
            <p className="font-sans text-text mb-6">{result.summary}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-sm">
              <div>
                <span className="text-muted block">Body fat est.</span>
                <span className="text-accent3">{result.estimatedBodyFatRange}</span>
              </div>
              <div>
                <span className="text-muted block">Calories</span>
                <span className="text-accent3">{result.calorieTarget}</span>
              </div>
              <div>
                <span className="text-muted block">Protein (g)</span>
                <span className="text-accent3">{result.proteinTarget}</span>
              </div>
              <div>
                <span className="text-muted block">Carbs / Fat (g)</span>
                <span className="text-accent3">{result.carbTarget} / {result.fatTarget}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-card p-6">
              <h3 className="font-display text-lg text-accent3 uppercase tracking-wide mb-3">
                Strengths
              </h3>
              <ul className="font-sans text-muted space-y-1">
                {result.visibleStrengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="bg-card border border-border rounded-card p-6">
              <h3 className="font-display text-lg text-accent2 uppercase tracking-wide mb-3">
                Areas to focus
              </h3>
              <ul className="font-sans text-muted space-y-1">
                {result.areasToFocus.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>

          {result.postureObservations && (
            <div className="bg-card border border-border rounded-card p-4">
              <span className="font-mono text-sm text-muted">Posture: </span>
              <span className="font-sans text-text">{result.postureObservations}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSaveToProgress}
              disabled={saving}
              className="bg-accent text-black font-sans font-bold uppercase px-6 py-3 rounded-card hover:shadow-glow disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save to Progress timeline'}
            </button>
            <Link
              href="/workouts"
              className="bg-bg3 border border-border text-text font-sans font-bold uppercase px-6 py-3 rounded-card hover:border-accent transition-colors"
            >
              Generate my workout plan
            </Link>
            <Link
              href="/nutrition"
              className="bg-bg3 border border-border text-text font-sans font-bold uppercase px-6 py-3 rounded-card hover:border-accent transition-colors"
            >
              Set my nutrition goals
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
