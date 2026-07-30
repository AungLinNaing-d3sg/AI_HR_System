'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useDeleteExchangeRate } from '@/hooks/useDeleteExchangeRate';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Pagination } from '@/components/common/Pagination';
import { ExchangeRateFormModal } from '@/components/forms/ExchangeRateFormModal';
import { cn } from '@/lib/utils/cn';
import type { ExchangeRate } from '@/types/domain.types';

type ModalState = { mode: 'create' } | { mode: 'edit'; exchangeRate: ExchangeRate } | null;

/** Formats an ISO `YYYY-MM-DD` date for display, matching `GenerateInvoiceForm`'s UTC-safe convention. */
function formatEffectiveDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/**
 * `/admin/exchange-rates` management page content (`docs/HR_System_FE_wireframe.pdf`):
 * a From/To/Rate/Effective date table of every rate defined FROM the base
 * currency, an "+ Add Rate" action, per-row Edit/Delete actions, and an
 * informational note at the bottom.
 *
 * The base-currency summary cards previously shown above the table were
 * removed (they duplicated the "Base currency" badge/rate info already
 * visible in the table below and required an extra, unpaginated
 * `useExchangeRates()` fetch of every rate just to compute each card's
 * latest-rate figure); this component now only fetches the table's own
 * paginated page of rates.
 *
 * Owns its own header row, table, and footer note (rather than splitting
 * them into `page.tsx`) for the same reason `CurrenciesTable` does: the "+
 * Add Rate" action opens a modal, not a routed page, so keeping the modal's
 * open/edit state, the table, and the delete confirmation together in one
 * client component avoids splitting closely-related state across a Server
 * Component boundary for no benefit.
 */
export function ExchangeRatesTable() {
  const {
    currencies,
    isLoading: isLoadingCurrencies,
    isError: isCurrenciesError,
    error: currenciesError,
  } = useCurrencies();

  const baseCurrency = currencies.find((currency) => currency.isBaseCurrency) ?? null;

  const { pageNo, pageSize, goToPage } = usePagination();
  // Only rates FROM the base currency are surfaced on this screen - matches
  // the wireframe's "/admin/exchange-rates" table (From/To/Rate/Effective
  // date, e.g. SGD -> USD, SGD -> INR); cross-rates between two non-base
  // currencies aren't part of this feature. Scoped server-side via
  // `fromCurrencyId` so this table's own pagination is correct.
  const {
    exchangeRates: pagedExchangeRates,
    totalCount: pagedTotalCount,
    isLoading: isLoadingPaged,
    isError: isPagedError,
    error: pagedError,
    refetch: refetchPaged,
  } = useExchangeRates({ pageNo, pageSize, fromCurrencyId: baseCurrency?.id });
  const {
    deleteExchangeRate,
    isDeleting,
    error: deleteError,
    reset: resetDeleteError,
  } = useDeleteExchangeRate();
  const [modalState, setModalState] = useState<ModalState>(null);
  const [pendingDelete, setPendingDelete] = useState<ExchangeRate | null>(null);

  const baseCurrencyRates = baseCurrency
    ? [...pagedExchangeRates].sort(
        (a, b) => a.toCurrency.code.localeCompare(b.toCurrency.code) || b.effectiveDate.localeCompare(a.effectiveDate)
      )
    : [];

  const isPageLoading = isLoadingCurrencies || isLoadingPaged;
  const isPageError = isCurrenciesError || isPagedError;

  const handleRetry = () => {
    refetchPaged();
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteExchangeRate(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      // Surfaced via `deleteError` below; keep the dialog open so the user can retry or cancel.
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Exchange Rates</h1>
          <p className="text-sm text-zinc-500">
            Define conversion rates from the base currency{baseCurrency ? ` (${baseCurrency.code})` : ''} to other
            currencies.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            resetDeleteError();
            setModalState({ mode: 'create' });
          }}
          disabled={!baseCurrency}
          title={!baseCurrency ? 'Set a base currency on Currencies before adding exchange rates.' : undefined}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Rate
        </Button>
      </header>

      {deleteError && <Alert variant="error">{deleteError}</Alert>}

      {isPageLoading && (
        <p aria-live="polite" className="text-sm text-zinc-500">
          Loading exchange rates…
        </p>
      )}

      {isPageError && (
        <div className="space-y-3">
          <Alert variant="error">{pagedError ?? currenciesError ?? 'Could not load exchange rates.'}</Alert>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      )}

      {!isPageLoading && !isPageError && (
        <>
          {currencies.length === 0 && (
            <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
              <p className="text-sm text-zinc-600">
                No currencies configured yet. Add currencies on{' '}
                <Link href="/admin/currencies" className="font-medium text-brand hover:underline">
                  Currencies
                </Link>{' '}
                first.
              </p>
            </div>
          )}

          {baseCurrency && baseCurrencyRates.length === 0 && (
            <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
              <p className="text-sm text-zinc-600">No exchange rates yet.</p>
            </div>
          )}

          {baseCurrency && baseCurrencyRates.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-zinc-200">
              <table className="w-full min-w-max text-left text-sm">
                <caption className="sr-only">
                  List of exchange rates from the base currency to other currencies.
                </caption>
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      From
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      To
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Rate
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Effective Date
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
                  {baseCurrencyRates.map((rate) => (
                    <tr key={rate.id}>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-700">
                          {rate.fromCurrency.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-700">
                          {rate.toCurrency.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900">{rate.rate}</p>
                        <p className="text-xs text-zinc-500">
                          1 {rate.fromCurrency.code} = {rate.rate} {rate.toCurrency.code}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{formatEffectiveDate(rate.effectiveDate)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            rate.isActive ? 'bg-green-100 text-green-800' : 'bg-zinc-200 text-zinc-700'
                          )}
                        >
                          {rate.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setModalState({ mode: 'edit', exchangeRate: rate })}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              resetDeleteError();
                              setPendingDelete(rate);
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

          {baseCurrency && (
            <Pagination
              pageNo={pageNo}
              pageSize={pageSize}
              totalCount={pagedTotalCount}
              onPageChange={goToPage}
              isLoading={isLoadingPaged}
              itemLabel="exchange rates"
            />
          )}
        </>
      )}

      {!isPageLoading && !isPageError && (
        <Alert variant="info">
          Exchange rates are applied when generating invoices in non-base currencies. Rates are effective from
          their specified date and remain active until a newer rate is added for the same currency pair.
        </Alert>
      )}

      <ExchangeRateFormModal
        open={modalState !== null}
        mode={modalState?.mode ?? 'create'}
        exchangeRate={modalState?.mode === 'edit' ? modalState.exchangeRate : undefined}
        onSuccess={() => setModalState(null)}
        onClose={() => setModalState(null)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete exchange rate"
        description={
          pendingDelete
            ? `Are you sure you want to delete the ${pendingDelete.fromCurrency.code} → ${pendingDelete.toCurrency.code} rate effective ${formatEffectiveDate(pendingDelete.effectiveDate)}? This cannot be undone.`
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
