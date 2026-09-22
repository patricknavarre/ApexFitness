'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  PRIMARY_MOBILE_NAV,
  isMoreSectionActive,
  isNavActive,
} from '@/components/dashboard/nav-config';
import { MoreNavSheet } from '@/components/dashboard/MoreNavSheet';
import { useMoveSessionGuardOptional } from '@/context/MoveSessionGuardContext';

function IconMoreDots() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const guard = useMoveSessionGuardOptional();
  const moreActive = isMoreSectionActive(pathname);

  function navigate(href: string) {
    setMoreOpen(false);
    if (guard && !guard.tryNavigate(href)) return;
    router.push(href);
  }

  return (
    <>
      <nav
        className="md:hidden fixed left-1/2 z-40 -translate-x-1/2"
        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        aria-label="Primary"
      >
        <div className="flex items-end gap-0.5 rounded-full border border-border/60 bg-card/90 px-2 py-1.5 shadow-glow backdrop-blur-xl">
          {PRIMARY_MOBILE_NAV.map((item) => {
            const active = isNavActive(pathname, item.href);
            const isRide = item.href === '/cycling';
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href)}
                className={`relative flex flex-col items-center justify-center min-w-[3.25rem] px-2.5 py-1.5 rounded-full transition-all duration-200 ${
                  active
                    ? isRide
                      ? 'text-black bg-accent shadow-glow scale-105'
                      : 'text-accent bg-accent/10'
                    : 'text-muted hover:text-tan'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <item.Icon />
                {active && (
                  <span className="font-sans text-[9px] font-semibold uppercase tracking-wide mt-0.5 leading-none">
                    {item.mobileLabel ?? item.label}
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center min-w-[3.25rem] px-2.5 py-1.5 rounded-full transition-colors ${
              moreActive
                ? 'text-accent bg-accent/10'
                : 'text-muted hover:text-tan'
            }`}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
          >
            <IconMoreDots />
            {moreActive && (
              <span className="font-sans text-[9px] font-semibold uppercase tracking-wide mt-0.5 leading-none">
                More
              </span>
            )}
          </button>
        </div>
      </nav>

      <MoreNavSheet
        open={moreOpen}
        pathname={pathname}
        onClose={() => setMoreOpen(false)}
        onNavigate={navigate}
      />
    </>
  );
}
