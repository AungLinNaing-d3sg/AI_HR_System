'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { ResourceRoleTypeForm } from '@/components/forms/ResourceRoleTypeForm';
import type { ResourceRoleType } from '@/types/domain.types';

export interface ResourceRoleTypeFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  /** Required when `mode === 'edit'`. */
  roleType?: ResourceRoleType;
  onSuccess: () => void;
  onClose: () => void;
}

/**
 * Accessible modal hosting `ResourceRoleTypeForm` for both the "+ Add Role
 * Type" and row-level "Edit" actions on `/admin/resource-role-types` (see
 * `ResourceRoleTypesTable`). Mirrors `CountryFormModal`/`CurrencyFormModal`'s
 * overlay/`Escape`-to-close conventions, using `role="dialog"` (not
 * `alertdialog`) since this hosts a form rather than a yes/no confirmation
 * prompt.
 */
export function ResourceRoleTypeFormModal({
  open,
  mode,
  roleType,
  onSuccess,
  onClose,
}: ResourceRoleTypeFormModalProps) {
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

  if (!open) return null;

  const titleId = 'resource-role-type-form-modal-title';

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
              {mode === 'edit' ? 'Edit role type' : 'Add role type'}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {mode === 'edit'
                ? 'Update the name and description of this resource role type.'
                : 'Add a new resource role type for project assignments and rate cards.'}
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

        <ResourceRoleTypeForm mode={mode} roleType={roleType} onSuccess={onSuccess} onCancel={onClose} />
      </div>
    </div>
  );
}
