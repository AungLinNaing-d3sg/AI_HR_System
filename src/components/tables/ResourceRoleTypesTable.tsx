'use client';

import { useMemo, useState } from 'react';
import { Briefcase, Pencil, Plus, Trash2 } from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { useResourceRoleTypes } from '@/hooks/useResourceRoleTypes';
import { useDeleteResourceRoleType } from '@/hooks/useDeleteResourceRoleType';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Pagination } from '@/components/common/Pagination';
import { ResourceRoleTypeFormModal } from '@/components/forms/ResourceRoleTypeFormModal';
import type { ResourceRoleType } from '@/types/domain.types';

type ModalState = { mode: 'create' } | { mode: 'edit'; roleType: ResourceRoleType } | null;

/**
 * `/admin/resource-role-types` management page content. There is no
 * dedicated Resource Role Type screen in `docs/HR_System_FE_wireframe.pdf`
 * (its Administration section only ever lists Users/Currencies/Exchange
 * Rates/Rate Cards/Countries), so this mirrors those existing reference-data
 * admin pages instead - a table of all resource role types with an "+ Add
 * Role Type" action and per-row Edit/Delete actions, following
 * `CountriesTable`/`CurrenciesTable`'s layout and styling for consistency
 * with the rest of the Administration section.
 *
 * Owns its own header row (rather than splitting it into `page.tsx`) because
 * the "+ Add Role Type" action opens a modal, not a routed page - keeping the
 * modal's open/edit state, the table, and the delete confirmation together in
 * one client component avoids splitting closely-related state across a
 * Server Component boundary for no benefit.
 *
 * Unlike `CountriesTable` (which disables "Delete" client-side once a
 * country has rate cards), this table has no reliable client-side signal for
 * "this role type is referenced by a project assignment or rate card" - so a
 * delete that the backend rejects for that reason simply surfaces its error
 * message via `deleteError` instead of being pre-emptively disabled.
 */
export function ResourceRoleTypesTable() {
  const { pageNo, pageSize, goToPage } = usePagination();
  const { roleTypes, totalCount, isLoading, isError, error, refetch } = useResourceRoleTypes({ pageNo, pageSize });
  const {
    deleteResourceRoleType,
    isDeleting,
    error: deleteError,
    reset: resetDeleteError,
  } = useDeleteResourceRoleType();
  const [modalState, setModalState] = useState<ModalState>(null);
  const [pendingDelete, setPendingDelete] = useState<ResourceRoleType | null>(null);

  const sortedRoleTypes = useMemo(
    () => [...roleTypes].sort((a, b) => a.name.localeCompare(b.name)),
    [roleTypes]
  );

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteResourceRoleType(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      // Surfaced via `deleteError` below; keep the dialog open so the user can retry or cancel.
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Resource Role Types</h1>
          <p className="text-sm text-zinc-500">
            Manage the resource roles used for project assignments and rate cards.
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
          Add Role Type
        </Button>
      </header>

      {deleteError && <Alert variant="error">{deleteError}</Alert>}

      {isLoading && (
        <p aria-live="polite" className="text-sm text-zinc-500">
          Loading resource role types…
        </p>
      )}

      {isError && (
        <div className="space-y-3">
          <Alert variant="error">{error ?? 'Could not load resource role types.'}</Alert>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && sortedRoleTypes.length === 0 && (
        <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
          <p className="text-sm text-zinc-600">No resource role types yet.</p>
        </div>
      )}

      {!isLoading && !isError && sortedRoleTypes.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-zinc-200">
          <table className="w-full min-w-max text-left text-sm">
            <caption className="sr-only">List of resource role types with their descriptions.</caption>
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Role name
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Description
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sortedRoleTypes.map((roleType) => (
                <tr key={roleType.id}>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 font-medium text-zinc-900">
                      <Briefcase className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                      {roleType.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {roleType.description ? roleType.description : <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setModalState({ mode: 'edit', roleType })}
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
                          setPendingDelete(roleType);
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
        <Pagination
          pageNo={pageNo}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={goToPage}
          isLoading={isLoading}
          itemLabel="resource role types"
        />
      )}

      <ResourceRoleTypeFormModal
        open={modalState !== null}
        mode={modalState?.mode ?? 'create'}
        roleType={modalState?.mode === 'edit' ? modalState.roleType : undefined}
        onSuccess={() => setModalState(null)}
        onClose={() => setModalState(null)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete role type"
        description={
          pendingDelete
            ? `Are you sure you want to delete "${pendingDelete.name}"? This cannot be undone.`
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
