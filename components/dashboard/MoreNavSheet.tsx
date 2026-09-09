'use client';

import { signOut } from 'next-auth/react';
import { MORE_NAV, isNavActive } from '@/components/dashboard/nav-config';
import { IconLogOut } from '@/components/ui/icons';

type Props = {
  open: boolean;
  pathname: string;
  onClose: () => void;
  onNavigate: (href: string) => void;
};

export function MoreNavSheet({ open, pathname, onClose, onNavigate }: Props) {
  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="more-nav-title"
        className="absolute left-0 right-0 bottom-0 rounded-t-2xl border border-border border-b-0 bg-card/98 backdrop-blur-md shadow-glow px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden />
        <div className="flex items-center justify-between mb-4">
          <h2
            id="more-nav-title"
            className="font-display text-xl text-tan uppercase tracking-wide"
          >
            More
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-sm text-muted hover:text-tan px-2 py-1"
          >
            Close
          </button>
        </div>
        <ul className="space-y-1">
          {MORE_NAV.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <li key={item.href}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.href)}
                  className={`w-full flex items-center gap-3 rounded-card px-3 py-3 text-left transition-colors ${
                    active
                      ? 'bg-accent/10 text-accent'
                      : 'text-text hover:bg-bg3 hover:text-tan'
                  }`}
                >
                  <span className="shrink-0">
                    <item.Icon />
                  </span>
                  <span className="font-sans text-sm font-semibold">{item.label}</span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center gap-3 rounded-card px-3 py-3 text-left text-muted hover:bg-bg3 hover:text-tan transition-colors"
            >
              <span className="shrink-0">
                <IconLogOut />
              </span>
              <span className="font-sans text-sm font-semibold">Log out</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
