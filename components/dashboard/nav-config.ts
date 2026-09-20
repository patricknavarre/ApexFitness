import {
  IconHome,
  IconScan,
  IconDumbbell,
  IconLeaf,
  IconChart,
  IconSettings,
  IconBook,
  IconShield,
  IconMove,
  IconBike,
} from '@/components/ui/icons';

export type NavIcon = () => JSX.Element;

export type NavItemConfig = {
  href: string;
  label: string;
  Icon: NavIcon;
  mobileLabel?: string;
};

/** Full desktop sidebar list. */
export const DESKTOP_NAV: NavItemConfig[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: IconHome },
  { href: '/daily-stoic', label: 'Daily Stoic', Icon: IconBook, mobileLabel: 'Stoic' },
  { href: '/analysis', label: 'AI Analysis', Icon: IconScan },
  { href: '/workouts', label: 'Workouts', Icon: IconDumbbell },
  { href: '/move', label: 'Move', Icon: IconMove },
  { href: '/cycling', label: 'Virtual Ride', Icon: IconBike, mobileLabel: 'Ride' },
  { href: '/self-defense', label: 'Self-Defense', Icon: IconShield, mobileLabel: 'Defense' },
  { href: '/nutrition', label: 'Nutrition', Icon: IconLeaf },
  { href: '/progress', label: 'Progress', Icon: IconChart },
  { href: '/settings', label: 'Settings', Icon: IconSettings },
];

/** Primary floating dock tabs (More is a button, not a route). */
export const PRIMARY_MOBILE_NAV: NavItemConfig[] = [
  { href: '/dashboard', label: 'Home', Icon: IconHome, mobileLabel: 'Home' },
  { href: '/workouts', label: 'Workouts', Icon: IconDumbbell },
  { href: '/move', label: 'Move', Icon: IconMove },
  { href: '/nutrition', label: 'Nutrition', Icon: IconLeaf },
];

/** Items shown in the More sheet. */
export const MORE_NAV: NavItemConfig[] = [
  { href: '/daily-stoic', label: 'Daily Stoic', Icon: IconBook, mobileLabel: 'Stoic' },
  { href: '/analysis', label: 'AI Analysis', Icon: IconScan },
  { href: '/cycling', label: 'Virtual Ride', Icon: IconBike, mobileLabel: 'Ride' },
  { href: '/self-defense', label: 'Self-Defense', Icon: IconShield, mobileLabel: 'Defense' },
  { href: '/progress', label: 'Progress', Icon: IconChart },
  { href: '/settings', label: 'Settings', Icon: IconSettings },
];

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
}

/** True when current path is under a More-sheet destination. */
export function isMoreSectionActive(pathname: string): boolean {
  return MORE_NAV.some((item) => isNavActive(pathname, item.href));
}
