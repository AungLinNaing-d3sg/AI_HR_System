'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { UserEditForm } from '@/components/forms/UserEditForm';
import type { AdminUserListItem } from '@/types/domain.types';

export interface UserEditFormModalProps {
  open: boolean;
  /** Required while `open` is `true`. */
  user?: AdminUserListItem;
  onSuccess: () => void;
  onClose: () => void;
}

/**
 * Accessible modal hosting `UserEditForm` for the row-level "Edit" action on
 * `/admin/users` (see `UsersTable`). Mirrors `CountryFormModal`/
 * `CurrencyFormModal`'s overlay/`Escape`-to-close conventions, using
 * `role="dialog"` (not `alertdialog`) since this hosts a form rather than a
 * yes/no confirmation prompt. Unlike those, this modal is edit-only - user
 * creation already has its own dedicated `/admin/users/create` page.
 */
export function UserEditFormModal({ open, user, onSuccess, onClose }: UserEditFormModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !user) return null;

  const titleId = 'user-edit-form-modal-title';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg focus:outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
              Edit user
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Update {user.firstName} {user.lastName}&rsquo;s account details.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-zinc-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <UserEditForm user={user} onSuccess={onSuccess} onCancel={onClose} />
      </div>
    </div>
  );
}
