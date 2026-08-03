'use client';

import Link from 'next/link';
import { FolderKanban, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { ChangePasswordForm } from '@/components/forms/ChangePasswordForm';
import { UpdateProfileForm } from '@/components/forms/UpdateProfileForm';
import { Alert } from '@/components/ui/Alert';
import { formatRole } from '@/lib/utils/formatRole';
import { getInitials } from '@/lib/utils/getInitials';

export default function ProfilePage() {
  const { user, role, hasHydrated } = useAuth();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">My account</h1>
        <p className="mt-1 text-sm text-zinc-500">
          View and manage your personal information, country, and security settings.
        </p>
      </header>

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
        <>
          <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-semibold text-brand-foreground"
              >
                {getInitials(user.firstName, user.lastName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-zinc-900">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-sm text-zinc-500">{user.email}</p>
                <span className="mt-1 inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                  {formatRole(user.role)}
                </span>
              </div>
            </div>
            <LogoutButton />
          </section>

          {(role === 'SystemAdmin' || role === 'ProjectAdmin') && (
            <section className="flex flex-wrap gap-3">
              {role === 'SystemAdmin' && (
                <Link
                  href="/admin/users/create"
                  className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
                >
                  <UserPlus className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                  Create a new user
                </Link>
              )}
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
              >
                <FolderKanban className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                Manage projects
              </Link>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <UpdateProfileForm user={user} />
            </section>
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <ChangePasswordForm />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
