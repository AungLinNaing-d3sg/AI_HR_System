'use client';

import { useMemo, useState } from 'react';
import { Globe, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCountries } from '@/hooks/useCountries';
import { useDeleteCountry } from '@/hooks/useDeleteCountry';
import { useRateCards } from '@/hooks/useRateCards';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { CountryFormModal } from '@/components/forms/CountryFormModal';
import type { Country } from '@/types/domain.types';

type ModalState = { mode: 'create' } | { mode: 'edit'; country: Country } | null;

/**
 * Counts rate cards per country id, backing the `/admin/countries` "Rate
 * Cards" column (`docs/HR_System_FE_wireframe.pdf`: "2 rate cards" / "No
 * rate cards"). Mirrors `RateCardsTable`'s `buildCountrySummaries` grouping
 * approach, but only needs a count here rather than a full role/rate
 * breakdown.
 */
function buildRateCardCountsByCountryId(rateCards: { country: { id: string } }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const rateCard of rateCards) {
    counts.set(rateCard.country.id, (counts.get(rateCard.country.id) ?? 0) + 1);
  }
  return counts;
}

/**
 * `/admin/countries` management page content (`docs/HR_System_FE_wireframe.pdf`):
 * a table of all countries with a Globe icon, ISO code badge, a rate-card
 * count sourced from `/admin/rate-cards`' data, a Status badge, an "+ Add
 * Country" action, and per-row Edit/Delete actions.
 *
 * Owns its own header row (rather than splitting it into `page.tsx`, as
 * `CurrenciesTable`/`RateCardsTable` do for the same reason) because the "+
 * Add Country" action opens a modal, not a routed page - keeping the modal's
 * open/edit state, the table, and the delete confirmation together in one
 * client component avoids splitting closely-related state across a Server
 * Component boundary for no benefit.
 *
 * The backend's `Country` DTO carries no `IsActive` flag (unlike
 * `Currency`/`RateCard` - see `CountryDto` in `types/api.types.ts`) and
 * `GetAllCountries` only ever returns non-deleted countries, so every row
 * shown here is definitionally active - the Status badge is rendered as a
 * static "Active" to match the wireframe rather than fabricating a field the
 * backend doesn't provide.
 */
export function CountriesTable() {
  const { countries, isLoading, isError, error, refetch } = useCountries();
  const { rateCards } = useRateCards();
  const { deleteCountry, isDeleting, error: deleteError, reset: resetDeleteError } = useDeleteCountry();
  const [modalState, setModalState] = useState<ModalState>(null);
  const [pendingDelete, setPendingDelete] = useState<Country | null>(null);

  const rateCardCountsByCountryId = useMemo(() => buildRateCardCountsByCountryId(rateCards), [rateCards]);

  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => a.name.localeCompare(b.name)),
    [countries]
  );

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteCountry(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      // Surfaced via `deleteError` below; keep the dialog open so the user can retry or cancel.
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Countries</h1>
          <p className="text-sm text-zinc-500">Manage supported countries for user assignments and rate cards.</p>
        </div>
        <Button
          type="button"
          onClick={() => {
            resetDeleteError();
            setModalState({ mode: 'create' });
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Country
        </Button>
      </header>

      {deleteError && <Alert variant="error">{deleteError}</Alert>}

      {isLoading && (
        <p aria-live="polite" className="text-sm text-zinc-500">
          Loading countries…
        </p>
      )}

      {isError && (
        <div className="space-y-3">
          <Alert variant="error">{error ?? 'Could not load countries.'}</Alert>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && sortedCountries.length === 0 && (
        <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
          <p className="text-sm text-zinc-600">No countries yet.</p>
        </div>
      )}

      {!isLoading && !isError && sortedCountries.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-zinc-200">
          <table className="w-full min-w-max text-left text-sm">
            <caption className="sr-only">List of supported countries with rate card counts and status.</caption>
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Country
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Code
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Rate Cards
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
              {sortedCountries.map((country) => {
                const rateCardCount = rateCardCountsByCountryId.get(country.id) ?? 0;
                return (
                  <tr key={country.id}>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 font-medium text-zinc-900">
                        <Globe className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                        {country.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-700">
                        {country.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {rateCardCount > 0 ? (
                        <span className="text-zinc-700">
                          {rateCardCount} rate card{rateCardCount === 1 ? '' : 's'}
                        </span>
                      ) : (
                        <span className="text-zinc-400">No rate cards</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setModalState({ mode: 'edit', country })}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={rateCardCount > 0}
                          title={
                            rateCardCount > 0
                              ? 'This country has rate cards and cannot be deleted. Remove its rate cards first.'
                              : undefined
                          }
                          onClick={() => {
                            resetDeleteError();
                            setPendingDelete(country);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CountryFormModal
        open={modalState !== null}
        mode={modalState?.mode ?? 'create'}
        country={modalState?.mode === 'edit' ? modalState.country : undefined}
        onSuccess={() => setModalState(null)}
        onClose={() => setModalState(null)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete country"
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
