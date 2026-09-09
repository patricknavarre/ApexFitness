'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { DESKTOP_NAV, isNavActive } from '@/components/dashboard/nav-config';
import { MobileNav } from '@/components/dashboard/MobileNav';
import { IconLogOut } from '@/components/ui/icons';
import { usePathname } from 'next/navigation';

function NavItem({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: () => JSX.Element;
}) {
  const pathname = usePathname();
  const active = isNavActive(pathname, href);
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-card transition-colors duration-200 ${
        active ? 'bg-accent3 text-tan' : 'text-muted hover:text-tan hover:bg-bg2'
      }`}
    >
      <span className="flex-shrink-0">
        <Icon />
      </span>
      <span className="font-sans text-sm whitespace-nowrap">{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-full bg-card border-r border-border z-20 transition-[width] duration-200"
        style={{ width: expanded ? 240 : 72 }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div className="p-3 flex items-center justify-center h-14 border-b border-border">
          <Link href="/dashboard" className="font-display text-xl text-tan tracking-wide">
            APEX
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-hidden">
          {DESKTOP_NAV.map((item) => (
            <NavItem key={item.href} href={item.href} label={item.label} Icon={item.Icon} />
          ))}
        </nav>
        <div className="p-2 border-t border-border">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-card text-muted hover:text-text hover:bg-bg2 transition-colors text-left font-sans text-sm"
          >
            <span className="flex-shrink-0">
              <IconLogOut />
            </span>
            <span className="whitespace-nowrap">Log out</span>
          </button>
        </div>
      </aside>

      <MobileNav />
    </>
  );
}
