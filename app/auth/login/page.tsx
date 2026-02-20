'use client';

import { useState, Suspense } from 'react';
import { signIn, getSession } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');
  const sessionRedirect = searchParams.get('session') === 'redirect';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: '/dashboard',
      });
      setLoading(false);
      if (res?.error) {
        setError('Invalid email or password.');
        return;
      }
      const session = await getSession();
      if (session?.user) {
        window.location.href = res?.url || '/dashboard';
        return;
      }
      setError(
        'Sign-in succeeded but session wasn’t set. In Vercel: set NEXTAUTH_URL to your exact app URL (e.g. https://apex-fitness-ecru.vercel.app) and NEXTAUTH_SECRET, then in Project Settings → Environment Variables turn OFF "Automatically expose System Environment Variables" so your NEXTAUTH_URL is used. Redeploy after saving.'
      );
    } catch {
      setLoading(false);
      setError('Something went wrong. Check your connection and try again.');
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative z-10">
      <div className="w-full max-w-md space-y-4">
        {sessionRedirect && (
          <div className="bg-accent2/20 border border-accent2 rounded-card p-4">
            <p className="font-sans text-accent2 text-sm">
              You were sent back because the app couldn&apos;t verify your session. Auth is now checked on the server—redeploy and try again. If it still fails, in Vercel set <strong>NEXTAUTH_URL</strong> (your app URL) and <strong>NEXTAUTH_SECRET</strong>, then redeploy.
            </p>
          </div>
        )}
        <div className="bg-card border border-border rounded-card p-8">
          <h1 className="font-display text-3xl text-accent uppercase tracking-wide text-center">
            Sign in
          </h1>
          {registered && (
            <p className="font-sans text-accent3 text-sm text-center mt-2">
              Account created. Sign in below.
            </p>
          )}
          {error && (
            <p className="font-sans text-accent2 text-sm text-center mt-2">{error}</p>
          )}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block font-sans text-sm text-muted mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-bg2 border border-border rounded-card px-4 py-3 font-sans text-text focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label htmlFor="password" className="block font-sans text-sm text-muted mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-bg2 border border-border rounded-card px-4 py-3 font-sans text-text focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-black font-sans font-bold uppercase py-3 rounded-card hover:shadow-glow transition-shadow disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
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
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-accent hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="bg-card border border-border rounded-card p-8 w-full max-w-md animate-pulse h-80" />
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
