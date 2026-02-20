'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

const GOALS = [
  'lose weight',
  'build muscle',
  'improve endurance',
  'general fitness',
];

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    sex: '',
    heightIn: '',
    weightLbs: '',
    goal: '',
  });

  function update(f: string, value: string) {
    setForm((prev) => ({ ...prev, [f]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || undefined,
          email: form.email,
          password: form.password,
          age: form.age ? Number(form.age) : undefined,
          sex: form.sex || undefined,
          heightCm: form.heightIn ? Number(form.heightIn) * 2.54 : undefined,
          weightKg: form.weightLbs ? Number(form.weightLbs) / 2.205 : undefined,
          goal: form.goal || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Sign up failed.');
        setLoading(false);
        return;
      }
      const signInRes = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
        callbackUrl: '/dashboard',
      });
      if (signInRes?.url) {
        window.location.href = signInRes.url;
        return;
      }
      router.push('/auth/login?registered=1');
    } catch {
      setError('Something went wrong.');
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 relative z-10">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-card p-8">
          <h1 className="font-display text-3xl text-accent uppercase tracking-wide text-center">
            Create account
          </h1>
          {error && (
            <p className="font-sans text-accent2 text-sm text-center mt-2">{error}</p>
          )}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block font-sans text-sm text-muted mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="w-full bg-bg2 border border-border rounded-card px-4 py-3 font-sans text-text focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block font-sans text-sm text-muted mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
                className="w-full bg-bg2 border border-border rounded-card px-4 py-3 font-sans text-text focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block font-sans text-sm text-muted mb-1">Password * (min 8)</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                required
                minLength={8}
                className="w-full bg-bg2 border border-border rounded-card px-4 py-3 font-sans text-text focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-sans text-sm text-muted mb-1">Age</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={form.age}
                  onChange={(e) => update('age', e.target.value)}
                  className="w-full bg-bg2 border border-border rounded-card px-4 py-3 font-sans text-text focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block font-sans text-sm text-muted mb-1">Sex</label>
                <select
                  value={form.sex}
                  onChange={(e) => update('sex', e.target.value)}
                  className="w-full bg-bg2 border border-border rounded-card px-4 py-3 font-sans text-text focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-sans text-sm text-muted mb-1">Height (in)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 70"
                  value={form.heightIn}
                  onChange={(e) => update('heightIn', e.target.value)}
                  className="w-full bg-bg2 border border-border rounded-card px-4 py-3 font-sans text-text focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block font-sans text-sm text-muted mb-1">Weight (lbs)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 165"
                  value={form.weightLbs}
                  onChange={(e) => update('weightLbs', e.target.value)}
                  className="w-full bg-bg2 border border-border rounded-card px-4 py-3 font-sans text-text focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
            <div>
              <label className="block font-sans text-sm text-muted mb-1">Primary goal</label>
              <select
                value={form.goal}
                onChange={(e) => update('goal', e.target.value)}
                className="w-full bg-bg2 border border-border rounded-card px-4 py-3 font-sans text-text focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">—</option>
                {GOALS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-black font-sans font-bold uppercase py-3 rounded-card hover:shadow-glow transition-shadow disabled:opacity-50"
            >
              {loading ? 'Creating account…' : 'Sign up'}
            </button>
          </form>
          <div className="mt-4 flex items-center gap-4">
            <span className="flex-1 h-px bg-border" />
            <span className="font-sans text-muted text-sm">or</span>
            <span className="flex-1 h-px bg-border" />
          </div>
          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            className="w-full mt-4 bg-bg2 border border-border text-text font-sans font-medium py-3 rounded-card hover:border-muted transition-colors"
          >
            Continue with Google
          </button>
          <p className="font-sans text-muted text-sm text-center mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
