'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

function getInitials(firstName: string, lastName: string): string {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim();
  return initials ? initials.toUpperCase() : '?';
}

export function UserMenu() {
  const { user, logout, isLoggingOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground"
      >
        {getInitials(user.firstName, user.lastName)}
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-20 w-56 rounded-md border border-zinc-200 bg-white py-2 shadow-lg"
        >
          <div className="border-b border-zinc-100 px-4 py-2">
            <p className="truncate text-sm font-medium text-zinc-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-zinc-500">{user.role}</p>
          </div>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            My account
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void logout();
            }}
            disabled={isLoggingOut}
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-zinc-50 disabled:opacity-50"
          >
            {isLoggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
