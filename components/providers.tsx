'use client';

import { SessionProvider } from 'next-auth/react';
import { PwaSessionKeepalive } from '@/components/auth/PwaSessionKeepalive';

/**
 * Keep SessionProvider minimal — aggressive refetch + /api/auth/session probing
 * was clearing cookies whenever JWT decode failed (salt/secret mismatch after
 * recent auth tweaks), which logged PWA users out on every cold start.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PwaSessionKeepalive />
      {children}
    </SessionProvider>
  );
}
