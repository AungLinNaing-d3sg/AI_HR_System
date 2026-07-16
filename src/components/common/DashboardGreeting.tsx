'use client';

import { useAuth } from '@/hooks/useAuth';

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardGreeting() {
  const { user, hasHydrated } = useAuth();
  const greeting = getGreeting(new Date().getHours());

  return (
    <h1 className="text-2xl font-semibold text-zinc-900">
      {greeting}
      {hasHydrated && user ? `, ${user.firstName}` : ''}
    </h1>
  );
}
