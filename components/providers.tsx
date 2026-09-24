'use client';

import { SessionProvider } from 'next-auth/react';
import { SessionKeepAlive } from '@/components/SessionKeepAlive';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus>
      <SessionKeepAlive />
      {children}
    </SessionProvider>
  );
}
