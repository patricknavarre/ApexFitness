'use client';

import { useEffect } from 'react';
import { getSession } from 'next-auth/react';

/**
 * Refresh the Auth.js session cookie via the Node /api/auth/session route.
 * Critical for iOS home-screen PWAs: cold starts and resume-from-background
 * must re-issue Set-Cookie with a fresh Max-Age (Edge middleware must NOT do this).
 */
export function SessionKeepAlive() {
  useEffect(() => {
    let cancelled = false;
    let lastRefresh = 0;

    async function refresh() {
      if (cancelled) return;
      const now = Date.now();
      // Debounce rapid focus/visibility storms on iOS.
      if (now - lastRefresh < 2_000) return;
      lastRefresh = now;
      try {
        // Prefer getSession so next-auth client cache stays in sync.
        await getSession();
        // Belt-and-suspenders: direct fetch guarantees credentials + Set-Cookie
        // even if the client cache short-circuits.
        await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
      } catch {
        /* ignore — offline / transient */
      }
    }

    void refresh();

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    const onPageShow = (e: PageTransitionEvent) => {
      // iOS often restores standalone PWAs from bfcache without a full reload.
      if (e.persisted || document.visibilityState === 'visible') void refresh();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  return null;
}
