'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const GOALS = ['lose fat', 'build muscle', 'maintain', 'improve performance'];
const FITNESS_LEVELS = ['beginner', 'intermediate', 'advanced'];
const EQUIPMENT = ['none', 'bodyweight', 'dumbbells', 'full gym', 'home gym'];

type Profile = {
  name: string | null;
  calorieTarget: number | null;
  proteinTarget: number | null;
  carbTarget: number | null;
  fatTarget: number | null;
  goal: string | null;
  fitnessLevel: string | null;
  equipment: string | null;
  daysPerWeek: number | null;
  units: string | null;
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    name: null,
    calorieTarget: null,
    proteinTarget: null,
    carbTarget: null,
    fatTarget: null,
    goal: null,
    fitnessLevel: null,
    equipment: null,
    daysPerWeek: null,
    units: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/me')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load'))))
      .then((data) => {
        if (!cancelled) {
          setProfile({
            name: data.name ?? null,
            calorieTarget: data.calorieTarget ?? null,
            proteinTarget: data.proteinTarget ?? null,
            carbTarget: data.carbTarget ?? null,
            fatTarget: data.fatTarget ?? null,
            goal: data.goal ?? null,
            fitnessLevel: data.fitnessLevel ?? null,
            equipment: data.equipment ?? null,
            daysPerWeek: data.daysPerWeek ?? null,
            units: data.units ?? null,
          });
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name || undefined,
          calorieTarget: profile.calorieTarget ?? undefined,
          proteinTarget: profile.proteinTarget ?? undefined,
          carbTarget: profile.carbTarget ?? undefined,
          fatTarget: profile.fatTarget ?? undefined,
          goal: profile.goal || undefined,
          fitnessLevel: profile.fitnessLevel || undefined,
          equipment: profile.equipment || undefined,
          daysPerWeek: profile.daysPerWeek ?? undefined,
          units: profile.units || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setProfile({
        name: data.name ?? null,
        calorieTarget: data.calorieTarget ?? null,
        proteinTarget: data.proteinTarget ?? null,
        carbTarget: data.carbTarget ?? null,
        fatTarget: data.fatTarget ?? null,
        goal: data.goal ?? null,
        fitnessLevel: data.fitnessLevel ?? null,
        equipment: data.equipment ?? null,
        daysPerWeek: data.daysPerWeek ?? null,
        units: data.units ?? null,
      });
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div>
        <h1 className="font-display text-3xl text-accent uppercase tracking-wide">Settings</h1>
        <p className="font-sans text-muted mt-2">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-3xl text-accent uppercase tracking-wide">Settings</h1>
        <p className="font-sans text-muted mt-2">Profile and nutrition targets.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border rounded-card p-6 space-y-4">
          <h2 className="font-display text-lg text-accent3 uppercase tracking-wide">Profile</h2>
          <label className="block font-sans text-sm text-muted">Name</label>
          <input
            type="text"
            value={profile.name ?? ''}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value || null }))}
            placeholder="Your name"
            className="w-full bg-bg3 border border-border rounded-card px-4 py-3 text-text font-sans focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="bg-card border border-border rounded-card p-6 space-y-4">
          <h2 className="font-display text-lg text-accent3 uppercase tracking-wide">
            Nutrition targets
          </h2>
          <p className="font-sans text-sm text-muted">
            Set daily targets to see progress on the Nutrition page.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-sans text-sm text-muted">Calories</label>
              <input
                type="number"
                min={0}
                value={profile.calorieTarget ?? ''}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    calorieTarget: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                placeholder="e.g. 2400"
                className="w-full bg-bg3 border border-border rounded-card px-4 py-3 text-text font-sans focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block font-sans text-sm text-muted">Protein (g)</label>
              <input
                type="number"
                min={0}
                value={profile.proteinTarget ?? ''}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    proteinTarget: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                placeholder="e.g. 150"
                className="w-full bg-bg3 border border-border rounded-card px-4 py-3 text-text font-sans focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block font-sans text-sm text-muted">Carbs (g)</label>
              <input
                type="number"
                min={0}
                value={profile.carbTarget ?? ''}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    carbTarget: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                placeholder="e.g. 250"
                className="w-full bg-bg3 border border-border rounded-card px-4 py-3 text-text font-sans focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block font-sans text-sm text-muted">Fat (g)</label>
              <input
                type="number"
                min={0}
                value={profile.fatTarget ?? ''}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    fatTarget: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                placeholder="e.g. 80"
                className="w-full bg-bg3 border border-border rounded-card px-4 py-3 text-text font-sans focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-card p-6 space-y-4">
          <h2 className="font-display text-lg text-accent3 uppercase tracking-wide">Fitness</h2>
          <div>
            <label className="block font-sans text-sm text-muted">Goal</label>
            <select
              value={profile.goal ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, goal: e.target.value || null }))}
              className="w-full bg-bg3 border border-border rounded-card px-4 py-3 text-text font-sans focus:ring-2 focus:ring-accent"
            >
              <option value="">—</option>
              {GOALS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-sans text-sm text-muted">Fitness level</label>
            <select
              value={profile.fitnessLevel ?? ''}
              onChange={(e) =>
                setProfile((p) => ({ ...p, fitnessLevel: e.target.value || null }))
              }
              className="w-full bg-bg3 border border-border rounded-card px-4 py-3 text-text font-sans focus:ring-2 focus:ring-accent"
            >
              <option value="">—</option>
              {FITNESS_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-sans text-sm text-muted">Equipment</label>
            <select
              value={profile.equipment ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, equipment: e.target.value || null }))}
              className="w-full bg-bg3 border border-border rounded-card px-4 py-3 text-text font-sans focus:ring-2 focus:ring-accent"
            >
              <option value="">—</option>
              {EQUIPMENT.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-sans text-sm text-muted">Days per week to train</label>
            <input
              type="number"
              min={1}
              max={7}
              value={profile.daysPerWeek ?? ''}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  daysPerWeek: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              className="w-full bg-bg3 border border-border rounded-card px-4 py-3 text-text font-sans focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-card p-6 space-y-4">
          <h2 className="font-display text-lg text-accent3 uppercase tracking-wide">Units</h2>
          <select
            value={profile.units ?? 'imperial'}
            onChange={(e) =>
              setProfile((p) => ({ ...p, units: e.target.value as 'imperial' | 'metric' }))
            }
            className="w-full bg-bg3 border border-border rounded-card px-4 py-3 text-text font-sans focus:ring-2 focus:ring-accent"
          >
            <option value="imperial">Imperial</option>
            <option value="metric">Metric</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-accent text-black font-sans font-bold uppercase px-8 py-4 rounded-card hover:shadow-glow transition-shadow disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}
