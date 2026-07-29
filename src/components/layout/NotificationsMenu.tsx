'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';

/**
 * No notification backend endpoint exists yet (see docs/HR_System_BE.postman_collection.json),
 * so this only renders the wireframe's bell icon + an empty-state dropdown rather than
 * fabricating unread counts/notification data.
 */
export function NotificationsMenu() {
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Notifications"
        className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-20 w-64 rounded-md border border-zinc-200 bg-white py-3 shadow-lg"
        >
          <p className="px-4 text-sm text-zinc-500">No new notifications.</p>
        </div>
      )}
    </div>
  );
}
