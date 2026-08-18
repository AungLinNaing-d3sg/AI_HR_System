'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Shared authenticated-app shell: fixed dark sidebar + header, with a mobile
 * drawer fallback for the sidebar.
 *
 * The outer shell is pinned to exactly the viewport height (`h-screen
 * overflow-hidden`) rather than the previous `min-h-screen`, which let the
 * whole page - sidebar included - grow and scroll together once the main
 * content exceeded the viewport. Now the sidebar (own `overflow-y-auto` nav
 * list) and the `<main>` content area each own their own vertical scrollbar
 * and scroll independently, while `Header` stays pinned above the scrolling
 * content.
 *
 * `min-h-0` on the right-hand column and on `main` is a deliberate, explicit
 * belt-and-suspenders alongside that `overflow-hidden`/`overflow-y-auto`
 * pairing: a flex item's automatic `min-height` is otherwise its *content*
 * size (not `0`), which - if either of those `overflow` values were ever
 * dropped or overridden by a page - would let `main` grow taller than the
 * `h-screen` shell instead of scrolling internally, reproducing the
 * whole-document-scroll/blank-sidebar bug this layout fixes (a long
 * `/timesheets/history` table is exactly the scenario that surfaced it).
 */
export function AppShell({ children }: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:flex md:shrink-0">
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

      <div className="flex h-screen min-h-0 min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setIsMobileNavOpen((open) => !open)} />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
