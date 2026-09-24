'use client';

import { useEffect } from 'react';
import { getSession } from 'next-auth/react';

/**
 * Hits /api/auth/session on mount and when the PWA becomes visible again so
 * Auth.js can rewrite the session cookie with a fresh expiry.
 */
export function SessionKeepAlive() {
  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        await getSession();
      } catch {
        /* ignore — offline / transient */
      }
    }

    void refresh();

    const onVisible = () => {
      if (cancelled) return;
      if (document.visibilityState === 'visible') void refresh();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  return null;
}
