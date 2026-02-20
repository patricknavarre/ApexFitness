'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconHome,
  IconScan,
  IconDumbbell,
  IconLeaf,
  IconChart,
  IconSettings,
} from '@/components/ui/icons';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', Icon: IconHome },
  { href: '/analysis', label: 'AI Analysis', Icon: IconScan },
  { href: '/workouts', label: 'Workouts', Icon: IconDumbbell },
  { href: '/nutrition', label: 'Nutrition', Icon: IconLeaf },
  { href: '/progress', label: 'Progress', Icon: IconChart },
  { href: '/settings', label: 'Settings', Icon: IconSettings },
];

function NavItem({ href, label, Icon }: { href: string; label: string; Icon: () => JSX.Element }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-card transition-colors ${
        active ? 'bg-bg3 text-accent' : 'text-muted hover:text-text hover:bg-bg2'
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
  const pathname = usePathname();
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
          <Link href="/dashboard" className="font-display text-xl text-accent">
            APEX
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-hidden">
          {NAV.map((item) => (
            <NavItem key={item.href} href={item.href} label={item.label} Icon={item.Icon} />
          ))}
        </nav>
      </aside>
      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-card border-t border-border z-20 flex items-center justify-around px-2">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${active ? 'text-accent' : 'text-muted hover:text-accent'}`}
            >
              <item.Icon />
              <span className="font-sans text-[10px] mt-0.5">{item.label.split(' ').pop()}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
