'use client';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

export function LogoutButton() {
  const { logout, isLoggingOut } = useAuth();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      isLoading={isLoggingOut}
      onClick={() => {
        void logout();
      }}
    >
      {isLoggingOut ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}
