'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getVisibleNavSections } from '@/lib/constants/nav.constants';
import { cn } from '@/lib/utils/cn';

interface SidebarProps {
  /** Called after a nav link is clicked - lets the mobile drawer close itself. */
  onNavigate?: () => void;
}

function isItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { role } = useAuth();
  const sections = getVisibleNavSections(role);

  return (
    <nav className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand text-sm font-semibold text-brand-foreground">
          HR
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
                const active = isItemActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-sidebar-active text-white'
                          : 'text-sidebar-foreground hover:bg-sidebar-active/60 hover:text-white'
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
