'use client';

import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { NotificationsMenu } from '@/components/layout/NotificationsMenu';
import { UserMenu } from '@/components/layout/UserMenu';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Toggle navigation menu"
          className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <Breadcrumbs pathname={pathname} />
      </div>

      <div className="flex items-center gap-2">
        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  );
}
