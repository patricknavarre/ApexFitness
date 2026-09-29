'use client';

import { useEffect } from 'react';
import { PWA_SESSION_STORAGE_KEY } from '@/lib/pwa-session';

const ATTEMPT_KEY = 'apex.pwa.restoreAttempt';

/**
 * iOS home-screen web apps drop the session cookie when the process is killed.
 * localStorage survives. Save the JWT while signed in, and put the cookie back
 * on the next cold start before the user has to sign in again.
 */
export function PwaSessionKeepalive() {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const sessionRes = await fetch('/api/auth/session', { credentials: 'include' });
        const session = (await sessionRes.json().catch(() => null)) as {
          user?: unknown;
        } | null;

        if (session?.user) {
          const tokenRes = await fetch('/api/auth/pwa-token', { credentials: 'include' });
          if (!tokenRes.ok) return;
          const body = (await tokenRes.json()) as { token?: string };
          if (body.token) {
            window.localStorage.setItem(PWA_SESSION_STORAGE_KEY, body.token);
          }
          window.sessionStorage.removeItem(ATTEMPT_KEY);
          return;
        }

        const saved = window.localStorage.getItem(PWA_SESSION_STORAGE_KEY);
        if (!saved) return;
        if (window.sessionStorage.getItem(ATTEMPT_KEY) === '1') return;
        window.sessionStorage.setItem(ATTEMPT_KEY, '1');

        const restore = await fetch('/api/auth/pwa-token', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: saved }),
        });
        if (!restore.ok) {
          window.localStorage.removeItem(PWA_SESSION_STORAGE_KEY);
          return;
        }
        if (!cancelled) window.location.reload();
      } catch {
        /* offline or storage blocked */
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
