'use client';

import { SessionProvider } from 'next-auth/react';
import { SessionKeepAlive } from '@/components/SessionKeepAlive';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Soft refresh while the app is open; do not clear local session on a
      // single failed focus refetch (PWA flaky network on wake).
      refetchInterval={10 * 60}
      refetchOnWindowFocus
      refetchWhenOffline={false}
    >
      <SessionKeepAlive />
      {children}
    </SessionProvider>
  );
}
