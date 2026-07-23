'use client';

import { useState } from 'react';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useDeleteCurrency } from '@/hooks/useDeleteCurrency';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { CurrencyFormModal } from '@/components/forms/CurrencyFormModal';
import { cn } from '@/lib/utils/cn';
import type { Currency } from '@/types/domain.types';

type ModalState = { mode: 'create' } | { mode: 'edit'; currency: Currency } | null;

/**
 * `/admin/currencies` management page content (`docs/HR_System_FE_wireframe.pdf`):
 * a table of all currencies with the base currency highlighted by a star
 * badge, an "+ Add Currency" action, per-row Edit/Delete actions, and an
 * informational note at the bottom explaining the base currency.
 *
 * Owns its own header row and footer note (rather than splitting them into
 * `page.tsx`, as `ProjectsTable`'s sibling `/projects` page does) because the
 * "+ Add Currency" action opens a modal, not a routed page - keeping the
 * modal's open/edit state, the table, and the delete confirmation together
 * in one client component avoids splitting closely-related state across a
 * Server Component boundary for no benefit.
 */
export function CurrenciesTable() {
  const { currencies, isLoading, isError, error, refetch } = useCurrencies();
  const { deleteCurrency, isDeleting, error: deleteError, reset: resetDeleteError } = useDeleteCurrency();
  const [modalState, setModalState] = useState<ModalState>(null);
  const [pendingDelete, setPendingDelete] = useState<Currency | null>(null);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteCurrency(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      // Surfaced via `deleteError` below; keep the dialog open so the user can retry or cancel.
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Currencies</h1>
          <p className="text-sm text-zinc-500">
            Configure supported currencies. Base currency is used for all rate card calculations.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            resetDeleteError();
            setModalState({ mode: 'create' });
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Currency
        </Button>
      </header>

      {deleteError && <Alert variant="error">{deleteError}</Alert>}

      {isLoading && (
        <p aria-live="polite" className="text-sm text-zinc-500">
          Loading currencies…
        </p>
      )}

      {isError && (
        <div className="space-y-3">
          <Alert variant="error">{error ?? 'Could not load currencies.'}</Alert>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && currencies.length === 0 && (
        <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
          <p className="text-sm text-zinc-600">No currencies yet.</p>
        </div>
      )}

      {!isLoading && !isError && currencies.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-zinc-200">
          <table className="w-full min-w-max text-left text-sm">
            <caption className="sr-only">List of supported currencies with the base currency and status.</caption>
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Code
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Symbol
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Base currency
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {currencies.map((currency) => (
                <tr key={currency.id}>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-700">
                      {currency.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">{currency.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{currency.symbol}</td>
                  <td className="px-4 py-3">
                    {currency.isBaseCurrency ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" aria-hidden="true" />
                        Base Currency
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        currency.isActive ? 'bg-green-100 text-green-800' : 'bg-zinc-200 text-zinc-700'
                      )}
                    >
                      {currency.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setModalState({ mode: 'edit', currency })}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currency.isBaseCurrency}
                        title={
                          currency.isBaseCurrency
                            ? 'The base currency cannot be deleted. Set another currency as base first.'
                            : undefined
                        }
                        onClick={() => {
                          resetDeleteError();
                          setPendingDelete(currency);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !isError && (
        <Alert variant="info">
          <span className="inline-flex items-start gap-1.5">
            <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" aria-hidden="true" />
            <span>
              The <strong>base currency (SGD)</strong> is the reference for all exchange rate conversions and rate
              card calculations. Only one currency can be the base at a time.
            </span>
          </span>
        </Alert>
      )}

      <CurrencyFormModal
        open={modalState !== null}
        mode={modalState?.mode ?? 'create'}
        currency={modalState?.mode === 'edit' ? modalState.currency : undefined}
        onSuccess={() => setModalState(null)}
        onClose={() => setModalState(null)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete currency"
        description={
          pendingDelete
            ? `Are you sure you want to delete "${pendingDelete.code} — ${pendingDelete.name}"? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        isConfirming={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
