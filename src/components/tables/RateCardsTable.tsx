'use client';

import { useMemo, useState } from 'react';
import { Filter, Pencil, Plus, Trash2 } from 'lucide-react';
import { useDeleteRateCard } from '@/hooks/useDeleteRateCard';
import { useRateCards } from '@/hooks/useRateCards';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { RateCardFormModal } from '@/components/forms/RateCardFormModal';
import { cn } from '@/lib/utils/cn';
import type { RateCard, RateCardCountryRef } from '@/types/domain.types';

type ModalState = { mode: 'create' } | { mode: 'edit'; rateCard: RateCard } | null;

interface CountrySummary {
  country: RateCardCountryRef;
  roleCount: number;
  minRate: number;
  maxRate: number;
  currencyCode: string;
}

/**
 * Groups `rateCards` by country for the `/admin/rate-cards` summary cards
 * (`docs/HR_System_FE_wireframe.pdf`): one card per country with a distinct
 * resource-role-type count and its billing rate range (e.g. "2 roles · SGD
 * 400-700/day"). Assumes every rate card for a given country is billed in
 * the same currency (true for all seeded/documented data - see
 * docs/HR_System_BE.postman_collection.json's `GetAllRateCards` example) and
 * uses the first one encountered if that ever isn't the case, rather than
 * failing.
 */
function buildCountrySummaries(rateCards: RateCard[]): CountrySummary[] {
  const byCountryId = new Map<string, RateCard[]>();
  for (const rateCard of rateCards) {
    const existing = byCountryId.get(rateCard.country.id);
    if (existing) {
      existing.push(rateCard);
    } else {
      byCountryId.set(rateCard.country.id, [rateCard]);
    }
  }

  return Array.from(byCountryId.values())
    .map((cards): CountrySummary => {
      const billingRates = cards.map((card) => card.billingRate);
      return {
        country: cards[0].country,
        roleCount: new Set(cards.map((card) => card.resourceRoleType.id)).size,
        minRate: Math.min(...billingRates),
        maxRate: Math.max(...billingRates),
        currencyCode: cards[0].currency.code,
      };
    })
    .sort((a, b) => a.country.name.localeCompare(b.country.name));
}

/** Formats an ISO `YYYY-MM-DD` date for display, matching `ExchangeRatesTable`'s UTC-safe convention. */
function formatEffectiveDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** "SGD 400-700/day", or "SGD 400/day" when every rate card for the country shares the same billing rate. */
function formatDailyRateRange(summary: CountrySummary): string {
  const range = summary.minRate === summary.maxRate ? `${summary.minRate}` : `${summary.minRate}-${summary.maxRate}`;
  return `${summary.currencyCode} ${range}/day`;
}

interface CountrySummaryCardProps {
  summary: CountrySummary;
  isSelected: boolean;
  onSelect: (countryId: string) => void;
}

/** One of the `/admin/rate-cards` country summary cards; clicking it toggles filtering the table down to that country. */
function CountrySummaryCard({ summary, isSelected, onSelect }: CountrySummaryCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(summary.country.id)}
      aria-pressed={isSelected}
      className={cn(
        'w-full rounded-lg border p-4 text-left shadow-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-zinc-900',
        isSelected ? 'border-brand bg-blue-50/60 ring-1 ring-brand' : 'border-zinc-200 bg-white hover:border-zinc-300'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-900">{summary.country.name}</p>
        <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-700">
          {summary.country.code}
        </span>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        {summary.roleCount} {summary.roleCount === 1 ? 'role' : 'roles'} · {formatDailyRateRange(summary)}
      </p>
    </button>
  );
}

/**
 * `/admin/rate-cards` management page content (`docs/HR_System_FE_wireframe.pdf`):
 * country summary cards at the top, a "Filter by country" dropdown
 * (synchronized with the cards - both drive the same `selectedCountryId`
 * state, so clicking a card or picking it from the dropdown does the same
 * thing, and clicking an already-selected card clears the filter), a
 * Country/Role/Daily Rate/Currency/Effective date/Status table, a "+ Add
 * Rate Card" action, and per-row Edit/Delete actions.
 *
 * Owns its own header row, cards, filter, and table (rather than splitting
 * them into `page.tsx`) for the same reason `ExchangeRatesTable`/
 * `CurrenciesTable` do: the "+ Add Rate Card" action opens a modal, not a
 * routed page, so keeping the modal's open/edit state, the cards, the
 * filter, the table, and the delete confirmation together in one client
 * component avoids splitting closely-related state across a Server
 * Component boundary for no benefit.
 */
export function RateCardsTable() {
  const { rateCards, isLoading, isError, error, refetch } = useRateCards();
  const { deleteRateCard, isDeleting, error: deleteError, reset: resetDeleteError } = useDeleteRateCard();
  const [modalState, setModalState] = useState<ModalState>(null);
  const [pendingDelete, setPendingDelete] = useState<RateCard | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);

  const countrySummaries = useMemo(() => buildCountrySummaries(rateCards), [rateCards]);

  const filteredRateCards = useMemo(() => {
    const filtered = selectedCountryId
      ? rateCards.filter((rateCard) => rateCard.country.id === selectedCountryId)
      : rateCards;
    return [...filtered].sort(
      (a, b) =>
        a.country.name.localeCompare(b.country.name) ||
        a.resourceRoleType.name.localeCompare(b.resourceRoleType.name) ||
        b.effectiveDate.localeCompare(a.effectiveDate)
    );
  }, [rateCards, selectedCountryId]);

  const handleToggleCountry = (countryId: string) => {
    setSelectedCountryId((current) => (current === countryId ? null : countryId));
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteRateCard(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      // Surfaced via `deleteError` below; keep the dialog open so the user can retry or cancel.
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Rate Cards</h1>
          <p className="text-sm text-zinc-500">
            Daily billing rates by country and role. Used in cost and invoice calculations.
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
          Add Rate Card
        </Button>
      </header>

      {deleteError && <Alert variant="error">{deleteError}</Alert>}

      {isLoading && (
        <p aria-live="polite" className="text-sm text-zinc-500">
          Loading rate cards…
        </p>
      )}

      {isError && (
        <div className="space-y-3">
          <Alert variant="error">{error ?? 'Could not load rate cards.'}</Alert>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && rateCards.length === 0 && (
        <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
          <p className="text-sm text-zinc-600">No rate cards yet.</p>
        </div>
      )}

      {!isLoading && !isError && rateCards.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {countrySummaries.map((summary) => (
              <CountrySummaryCard
                key={summary.country.id}
                summary={summary}
                isSelected={selectedCountryId === summary.country.id}
                onSelect={handleToggleCountry}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              <Label htmlFor="countryFilter" className="mb-0 whitespace-nowrap">
                Filter by country:
              </Label>
              <Select
                id="countryFilter"
                className="h-9 w-auto min-w-[10rem]"
                value={selectedCountryId ?? ''}
                onChange={(event) => setSelectedCountryId(event.target.value || null)}
              >
                <option value="">All Countries</option>
                {countrySummaries.map((summary) => (
                  <option key={summary.country.id} value={summary.country.id}>
                    {summary.country.name}
                  </option>
                ))}
              </Select>
            </div>
            <p className="text-xs text-zinc-500" aria-live="polite">
              Showing {filteredRateCards.length} of {rateCards.length} rate cards
            </p>
          </div>

          {filteredRateCards.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
              <p className="text-sm text-zinc-600">No rate cards match this filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-zinc-200">
              <table className="w-full min-w-max text-left text-sm">
                <caption className="sr-only">List of rate cards by country and role.</caption>
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Country
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Role
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Daily Rate
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Currency
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
                  {filteredRateCards.map((rateCard) => (
                    <tr key={rateCard.id}>
                      <td className="px-4 py-3 font-medium text-zinc-900">{rateCard.country.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                          {rateCard.resourceRoleType.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900">{rateCard.billingRate}</p>
                        <p className="text-xs text-zinc-500">Hourly: {rateCard.hourlyRate}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-700">
                          {rateCard.currency.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{formatEffectiveDate(rateCard.effectiveDate)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            rateCard.isActive ? 'bg-green-100 text-green-800' : 'bg-zinc-200 text-zinc-700'
                          )}
                        >
                          {rateCard.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setModalState({ mode: 'edit', rateCard })}
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
                              setPendingDelete(rateCard);
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
        </>
      )}

      <RateCardFormModal
        open={modalState !== null}
        mode={modalState?.mode ?? 'create'}
        rateCard={modalState?.mode === 'edit' ? modalState.rateCard : undefined}
        onSuccess={() => setModalState(null)}
        onClose={() => setModalState(null)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete rate card"
        description={
          pendingDelete
            ? `Are you sure you want to delete the ${pendingDelete.country.name} — ${pendingDelete.resourceRoleType.name} rate card effective ${formatEffectiveDate(pendingDelete.effectiveDate)}? This cannot be undone.`
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
