'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getVisibleNavSections } from '@/lib/constants/nav.constants';
import { cn } from '@/lib/utils/cn';
import { getInitials } from '@/lib/utils/getInitials';
import { formatRole } from '@/lib/utils/formatRole';

interface SidebarProps {
  /** Called after a nav link is clicked - lets the mobile drawer close itself. */
  onNavigate?: () => void;
}

function matchesRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * A nested route (e.g. `/timesheets/history`) matches both its own nav item
 * and its parent's (`/timesheets`) under a plain prefix check. Only the
 * item with the longest matching `href` should highlight - see the
 * wireframe's explicit "sub-pages highlight correctly, e.g.
 * /timesheets/history highlights 'Timesheet History', not 'My Timesheets'"
 * check (`docs/HR_System_FE_wireframe.pdf`).
 */
function findActiveHref(pathname: string, hrefs: readonly string[]): string | null {
  return hrefs
    .filter((href) => matchesRoute(pathname, href))
    .sort((a, b) => b.length - a.length)[0] ?? null;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user, role, logout, isLoggingOut } = useAuth();
  const sections = getVisibleNavSections(role);
  const activeHref = findActiveHref(
    pathname,
    sections.flatMap((section) => section.items.map((item) => item.href))
  );

  return (
    <nav className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand text-brand-foreground">
          <Building2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">HR System</p>
          <p className="text-xs text-sidebar-foreground-muted">Time &amp; Invoice</p>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {sections.map((section, index) => (
          <div key={section.title ?? `section-${index}`}>
            {section.title && (
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground-muted">
                {section.title}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = item.href === activeHref;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-sidebar-active text-white'
                          : 'text-sidebar-foreground hover:bg-sidebar-active/60 hover:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {user && (
        <div className="flex items-center gap-2.5 border-t border-sidebar-border px-4 py-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-foreground">
            {getInitials(user.firstName, user.lastName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-sidebar-foreground-muted">{formatRole(user.role)}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void logout();
            }}
            disabled={isLoggingOut}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground-muted transition-colors hover:bg-sidebar-active hover:text-white disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  );
}
