'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { ChangePasswordForm } from '@/components/forms/ChangePasswordForm';
import { UpdateProfileForm } from '@/components/forms/UpdateProfileForm';
import { Alert } from '@/components/ui/Alert';

export default function ProfilePage() {
  const { user, role, hasHydrated } = useAuth();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">My account</h1>
          {user && <p className="text-sm text-zinc-500">Signed in as {user.username}</p>}
        </div>
        <LogoutButton />
      </header>

      {role === 'SystemAdmin' && (
        <p className="text-sm">
          <Link href="/admin/users/create" className="font-medium text-zinc-900 underline underline-offset-4">
            Create a new user
          </Link>
        </p>
      )}

      {(role === 'SystemAdmin' || role === 'ProjectAdmin') && (
        <p className="text-sm">
          <Link href="/projects" className="font-medium text-zinc-900 underline underline-offset-4">
            Manage projects
          </Link>
        </p>
      )}

      {!hasHydrated && (
        <p aria-live="polite" className="text-sm text-zinc-500">
          Loading your profile…
        </p>
      )}

      {hasHydrated && !user && (
        <Alert variant="info">
          We couldn&apos;t find your profile details for this browser session. Please{' '}
          <Link href="/login" className="font-medium underline underline-offset-4">
            log in again
          </Link>{' '}
          to continue.
        </Alert>
      )}

      {hasHydrated && user && (
        <div className="grid gap-10 sm:grid-cols-2">
          <UpdateProfileForm user={user} />
          <ChangePasswordForm />
        </div>
      )}
    </main>
  );
}
