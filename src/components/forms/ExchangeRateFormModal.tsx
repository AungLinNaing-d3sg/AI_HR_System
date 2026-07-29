'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { ExchangeRateForm } from '@/components/forms/ExchangeRateForm';
import type { ExchangeRate } from '@/types/domain.types';

export interface ExchangeRateFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  /** Required when `mode === 'edit'`. */
  exchangeRate?: ExchangeRate;
  onSuccess: () => void;
  onClose: () => void;
}

/**
 * Accessible modal hosting `ExchangeRateForm` for both the "+ Add Rate" and
 * row-level "Edit" actions on `/admin/exchange-rates` (see
 * `ExchangeRatesTable`). Mirrors `CurrencyFormModal`'s overlay/`Escape`-to-close
 * conventions and `role="dialog"` (not `alertdialog`, since this hosts a
 * form rather than a yes/no confirmation prompt).
 */
export function ExchangeRateFormModal({ open, mode, exchangeRate, onSuccess, onClose }: ExchangeRateFormModalProps) {
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

  const titleId = 'exchange-rate-form-modal-title';

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
              {mode === 'edit' ? 'Edit exchange rate' : 'Add exchange rate'}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {mode === 'edit'
                ? 'Update the rate, effective date, and status of this exchange rate.'
                : 'Add a new conversion rate from the base currency.'}
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

        <ExchangeRateForm mode={mode} exchangeRate={exchangeRate} onSuccess={onSuccess} onCancel={onClose} />
      </div>
    </div>
  );
}
