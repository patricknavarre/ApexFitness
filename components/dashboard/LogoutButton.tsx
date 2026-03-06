'use client';

import { signOut } from 'next-auth/react';
import { IconLogOut } from '@/components/ui/icons';

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/' })}
      className="flex items-center gap-2 px-3 py-2 rounded-card text-muted hover:text-text hover:bg-bg2 transition-colors font-sans text-sm"
      aria-label="Log out"
    >
      <IconLogOut />
      <span className="hidden sm:inline">Log out</span>
    </button>
  );
}
