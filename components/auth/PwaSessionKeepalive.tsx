'use client';

import { useEffect } from 'react';
import { PWA_SESSION_STORAGE_KEY } from '@/lib/pwa-session';

const ATTEMPT_KEY = 'apex.pwa.restoreAttempt';
const FAIL_COUNT_KEY = 'apex.pwa.restoreFails';

function dashboardTarget(): string {
  if (typeof window === 'undefined') return '/dashboard';
  const path = window.location.pathname;
  // If we already restored while sitting on login, go to the app — do not reload login.
  if (path.startsWith('/auth/')) return '/dashboard';
  if (path === '/pwa') return '/dashboard';
  return `${path}${window.location.search}` || '/dashboard';
}

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
        const sessionRes = await fetch('/api/auth/session', {
          credentials: 'include',
        });
        const session = (await sessionRes.json().catch(() => null)) as {
          user?: unknown;
        } | null;

        if (session?.user) {
          const tokenRes = await fetch('/api/auth/pwa-token', {
            credentials: 'include',
          });
          if (tokenRes.ok) {
            const body = (await tokenRes.json()) as { token?: string };
            if (body.token) {
              window.localStorage.setItem(PWA_SESSION_STORAGE_KEY, body.token);
            }
          }
          window.sessionStorage.removeItem(ATTEMPT_KEY);
          window.sessionStorage.removeItem(FAIL_COUNT_KEY);
          return;
        }

        // /pwa owns the cold-start restore flow.
        if (window.location.pathname === '/pwa') return;

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
        if (cancelled) return;

        if (!restore.ok) {
          const fails =
            Number(window.sessionStorage.getItem(FAIL_COUNT_KEY) || '0') + 1;
          window.sessionStorage.setItem(FAIL_COUNT_KEY, String(fails));
          // Allow another try on a later cold start; only wipe after repeated 401s.
          if (restore.status === 401 && fails >= 3) {
            window.localStorage.removeItem(PWA_SESSION_STORAGE_KEY);
          }
          // Clear attempt so a new WebView open can retry (reload kept this stuck).
          window.sessionStorage.removeItem(ATTEMPT_KEY);
          return;
        }

        window.sessionStorage.removeItem(ATTEMPT_KEY);
        window.sessionStorage.removeItem(FAIL_COUNT_KEY);
        window.location.replace(dashboardTarget());
      } catch {
        /* offline or storage blocked */
        try {
          window.sessionStorage.removeItem(ATTEMPT_KEY);
        } catch {
          /* ignore */
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
