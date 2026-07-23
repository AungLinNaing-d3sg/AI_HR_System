'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { CurrencyForm } from '@/components/forms/CurrencyForm';
import type { Currency } from '@/types/domain.types';

export interface CurrencyFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  /** Required when `mode === 'edit'`. */
  currency?: Currency;
  onSuccess: () => void;
  onClose: () => void;
}

/**
 * Accessible modal hosting `CurrencyForm` for both the "+ Add Currency" and
 * row-level "Edit" actions on `/admin/currencies` (see `CurrenciesTable`).
 * Mirrors `ConfirmDialog`'s overlay/`Escape`-to-close conventions, but uses
 * `role="dialog"` (not `alertdialog`) since this hosts a form rather than a
 * yes/no confirmation prompt.
 */
export function CurrencyFormModal({ open, mode, currency, onSuccess, onClose }: CurrencyFormModalProps) {
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

  const titleId = 'currency-form-modal-title';

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
              {mode === 'edit' ? 'Edit currency' : 'Add currency'}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {mode === 'edit'
                ? 'Update the name, symbol, and status of this currency.'
                : 'Add a new supported currency.'}
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

        <CurrencyForm mode={mode} currency={currency} onSuccess={onSuccess} onCancel={onClose} />
      </div>
    </div>
  );
}
