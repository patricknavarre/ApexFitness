'use client';

import { useEffect, useState } from 'react';
import { PWA_SESSION_STORAGE_KEY } from '@/lib/pwa-session';

/**
 * Public bootstrap for the iOS home-screen shortcut.
 * Restores the session cookie from localStorage before hitting protected routes,
 * so the dashboard SSR gate does not win the race and dump the user on login.
 */
export default function PwaBootstrapPage() {
  const [message, setMessage] = useState('Opening APEX…');

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const sessionRes = await fetch('/api/auth/session', {
          credentials: 'include',
        });
        const session = (await sessionRes.json().catch(() => null)) as {
          user?: unknown;
        } | null;
        if (cancelled) return;
        if (session?.user) {
          window.location.replace('/dashboard');
          return;
        }

        const saved = window.localStorage.getItem(PWA_SESSION_STORAGE_KEY);
        if (!saved) {
          window.location.replace('/auth/login');
          return;
        }

        setMessage('Restoring your session…');
        const restore = await fetch('/api/auth/pwa-token', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: saved }),
        });
        if (cancelled) return;

        if (restore.ok) {
          window.sessionStorage.removeItem('apex.pwa.restoreAttempt');
          window.location.replace('/dashboard');
          return;
        }

        // Only drop the backup on a definitive auth rejection.
        if (restore.status === 401) {
          window.localStorage.removeItem(PWA_SESSION_STORAGE_KEY);
        }
        window.location.replace('/auth/login');
      } catch {
        if (!cancelled) window.location.replace('/auth/login');
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative z-10">
      <div className="bg-card border border-border rounded-card p-6 max-w-sm w-full text-center">
        <p className="font-display text-xl text-accent uppercase tracking-wide">
          APEX
        </p>
        <p className="font-sans text-sm text-muted mt-3">{message}</p>
      </div>
    </main>
  );
}
