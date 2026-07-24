import {
  ArrowLeftRight,
  BarChart3,
  CalendarRange,
  ClipboardList,
  Clock,
  Coins,
  CreditCard,
  FolderKanban,
  Globe,
  LayoutGrid,
  Receipt,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types/domain.types';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';

/**
 * Sidebar navigation model. Deliberately only lists routes that actually
 * exist in the app router today - the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`) explicitly calls out "all sidebar
 * links navigate without 404" as a bug it hit and fixed, so this list must
 * stay in lockstep with `src/app/**` (Reports, Invoices, Currencies,
 * Exchange Rates, Rate Cards, and Countries are all built - see the repo
 * root CLAUDE.md). Section title/order and per-item icons otherwise follow
 * the wireframe's sidebar exactly.
 */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Omit to show to every authenticated role. */
  roles?: readonly UserRole[];
}

export interface NavSection {
  /** Omit for a section rendered without a group heading (e.g. Dashboard). */
  title?: string;
  items: readonly NavItem[];
}

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutGrid }],
  },
  {
    title: 'Timesheet',
    items: [
      { label: 'Projects', href: '/projects', icon: FolderKanban },
      { label: 'My Timesheets', href: '/timesheets', icon: Clock },
      { label: 'Timesheet History', href: '/timesheets/history', icon: ClipboardList },
      {
        label: 'Timesheet Periods',
        href: '/timesheets/periods',
        icon: CalendarRange,
        roles: PROJECT_MANAGEMENT_ROLES,
      },
    ],
  },
  {
    title: 'Reports',
    items: [{ label: 'Reports', href: '/reports', icon: BarChart3, roles: PROJECT_MANAGEMENT_ROLES }],
  },
  {
    title: 'Billing',
    items: [{ label: 'Invoices', href: '/invoices', icon: Receipt, roles: PROJECT_MANAGEMENT_ROLES }],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users, roles: ['SystemAdmin'] },
      { label: 'Currencies', href: '/admin/currencies', icon: Coins, roles: ['SystemAdmin'] },
      { label: 'Exchange Rates', href: '/admin/exchange-rates', icon: ArrowLeftRight, roles: ['SystemAdmin'] },
      { label: 'Rate Cards', href: '/admin/rate-cards', icon: CreditCard, roles: ['SystemAdmin'] },
      { label: 'Countries', href: '/admin/countries', icon: Globe, roles: ['SystemAdmin'] },
    ],
  },
];

function isVisible(item: NavItem, role: UserRole | null): boolean {
  if (!item.roles) return true;
  if (!role) return false;
  return item.roles.includes(role);
}

/** Filters `NAV_SECTIONS` down to the items the given role may see, dropping any section left empty. */
export function getVisibleNavSections(role: UserRole | null): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => isVisible(item, role)),
  })).filter((section) => section.items.length > 0);
}
