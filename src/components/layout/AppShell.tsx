'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

interface AppShellProps {
  children: React.ReactNode;
}

/** Shared authenticated-app shell: fixed dark sidebar + header, with a mobile drawer fallback for the sidebar. */
export function AppShell({ children }: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <div className="relative z-10 h-full w-64 shadow-xl">
            <Sidebar onNavigate={() => setIsMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <Header onMenuClick={() => setIsMobileNavOpen((open) => !open)} />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
