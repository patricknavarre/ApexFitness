'use client';

import { signOut } from 'next-auth/react';
import { PWA_SESSION_STORAGE_KEY } from '@/lib/pwa-session';

export function signOutEverywhere() {
  try {
    window.localStorage.removeItem(PWA_SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem('apex.pwa.restoreAttempt');
  } catch {
    /* ignore */
  }
  return signOut({ callbackUrl: '/' });
}
