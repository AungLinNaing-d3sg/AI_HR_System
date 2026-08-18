'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Calendar, CheckCircle2, Clock, Hourglass, Lock, Pencil, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useApproveTimesheetEntry } from '@/hooks/useApproveTimesheetEntry';
import { useDeleteTimesheetEntry } from '@/hooks/useDeleteTimesheetEntry';
import { usePagination } from '@/hooks/usePagination';
import { useTimesheetHistory } from '@/hooks/useTimesheetHistory';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Pagination } from '@/components/common/Pagination';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { cn } from '@/lib/utils/cn';
import { getMondayOfWeek } from '@/lib/utils/week';
import type { TimesheetHistoryEntry } from '@/types/domain.types';

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const ALL_PROJECTS = 'all';

/**
 * Bordered, button-look styling for the per-row "Edit" action `<Link>`,
 * matching `ProjectsTable`'s own `ACTION_LINK_CLASSNAME` convention: the same
 * `h-8` height, border, background, and hover affordance as the adjacent
 * `size="sm"` `outline`-variant Approve/Delete `Button`s, so every row action
 * renders as an identically-sized, identically-styled control regardless of
 * whether it navigates (a link) or triggers a click handler (a button).
 */
const ACTION_LINK_CLASSNAME =
  'inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-zinc-900';

interface HistoryStatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClassName: string;
}

/** Icon-beside-value stat card (`docs/HR_System_FE_wireframe.pdf`'s `/timesheets/history` screen), with the label underneath the value. */
function HistoryStatCard({ label, value, icon: Icon, iconClassName }: HistoryStatCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-3">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', iconClassName)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-2xl font-semibold text-zinc-900">{value}</p>
          <p className="text-sm text-zinc-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function matchesFilters(
  entry: TimesheetHistoryEntry,
  filters: { from: string; to: string; projectId: string }
): boolean {
  if (filters.from && entry.entryDate < filters.from) return false;
  if (filters.to && entry.entryDate > filters.to) return false;
  if (filters.projectId !== ALL_PROJECTS && entry.projectId !== filters.projectId) return false;
  return true;
}

/**
 * The `/timesheets/history` table (see `docs/HR_System_FE_wireframe.pdf`'s
 * `/timesheets/history` screen): three icon-beside-value stat cards, a
 * single-line filter bar, and a Date/Project/Hours/Task Description/Status/
 * Actions table.
 *
 * The filter bar (Date From/To + Project + Filter/Reset, all inline in one
 * bordered row) mirrors the wireframe's compact layout and
 * `TimesheetReportTable`'s own filter bar on `/reports/timesheet` for
 * consistency - "Filter" applies `fromInput`/`toInput`/`projectInput` (with
 * the From-after-To cross-field validation below), "Reset" clears every
 * filter back to its default. All matching/filtering is client-side over
 * the *currently fetched page* of `useTimesheetHistory`'s rows - the same
 * page-scoped trade-off `TimesheetReportTable`'s own client-side `userId`
 * filter already documents, since neither `GetAllTimesheetEntries` nor
 * `GetProjectAdminTimesheetSummary` (see `app/api/timesheets/history/route.ts`)
 * take a date-range query param to filter server-side. `useTimesheetHistory`
 * already scopes rows by role server-side (own entries only for a plain
 * `User`, every entry for `ProjectAdmin`/`SystemAdmin`), so this component
 * only adds the User column for the roles that can see everyone's entries.
 *
 * Pagination: `usePagination`/the shared `Pagination` control
 * (`components/common/Pagination.tsx`) drive `useTimesheetHistory`'s
 * `pageNo`/`pageSize`, matching every other server-side-paginated list table
 * in this app (`ResourceRoleTypesTable`, `TimesheetReportTable`, etc.) -
 * applying or resetting a filter jumps back to page 1, same as
 * `TimesheetReportTable`'s own filter bar. Turning a page (or resetting back
 * to page 1) keeps the *current* rows mounted - via `useTimesheetHistory`'s
 * `placeholderData: keepPreviousData` - and only shows a small inline
 * "Updating…" note plus disables the Previous/Next/page-number buttons
 * (`isFetching`) while the next page loads, rather than unmounting the
 * whole stat-cards/filter-bar/table down to a bare loading line. That
 * previous, harder collapse-and-remount is what produced this table's
 * "scrolls down into blank space" bug: replacing the entire layout with a
 * one-line "Loading timesheet history…" paragraph shrank the visible
 * content to a sliver while the page's `flex-1` content column still
 * stretched to the full viewport height, so every page turn (Previous/Next
 * sits at the *bottom* of a full page, i.e. exactly where a user is already
 * scrolled to) briefly left a large empty gap below that sliver.
 *
 * Actions column, per row: all actions are right-aligned (the column's own
 * header label included) and rendered as identically-sized, identically-styled
 * bordered controls - same `h-8` box height, border, corner radius, and hover
 * affordance, with only a per-action text/border tint (neutral for Edit,
 * green for Approve, red for Delete) and a tight `gap-1.5` between them to
 * keep the actions column as narrow as possible. "Edit" (a `<Link>` styled to
 * look identical to the adjacent buttons) jumps to `/timesheets` pre-navigated
 * to that entry's week, reusing the grid's own create/update flow rather than
 * duplicating it here, for the signed-in user's own entry, *including* an
 * already-approved one - editing it resets it to Pending Approval and
 * requires the Project Admin to re-approve it, so it is never locked out for
 * its owner; plus "Delete" for the signed-in user's own *pending* entry (an
 * approved entry can never be deleted - see
 * `app/api/timesheets/entries/[id]/route.ts`'s `DELETE` handler). "Approve"
 * plus "Delete" for a pending entry that belongs to someone else, if the
 * caller can approve/manage timesheets. "Locked" (no action available) for
 * an already-approved entry that isn't the viewer's own and needs no further
 * review. Completes the entry's CRUD lifecycle (create via the grid, read
 * here, update via Edit, delete here).
 */
export function TimesheetHistoryTable() {
  const { user, role } = useAuth();
  const canApprove = Boolean(role && PROJECT_MANAGEMENT_ROLES.includes(role));

  const { pageNo, pageSize, goToPage } = usePagination();
  const { entries, totalCount, isLoading, isFetching, isError, error, refetch } = useTimesheetHistory({
    pageNo,
    pageSize,
  });
  const { approveEntry, isApproving, error: approveError, reset: resetApproveError } = useApproveTimesheetEntry();
  const { deleteEntry, isDeleting, error: deleteError, reset: resetDeleteError } = useDeleteTimesheetEntry();

  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [projectInput, setProjectInput] = useState(ALL_PROJECTS);
  const [appliedFilters, setAppliedFilters] = useState({ from: '', to: '', projectId: ALL_PROJECTS });
  const [filterError, setFilterError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TimesheetHistoryEntry | null>(null);

  const projectOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const entry of entries) {
      if (!byId.has(entry.projectId)) byId.set(entry.projectId, entry.projectName);
    }
    return Array.from(byId, ([projectId, projectName]) => ({ projectId, projectName }));
  }, [entries]);

  const filteredEntries = useMemo(
    () => entries.filter((entry) => matchesFilters(entry, appliedFilters)),
    [entries, appliedFilters]
  );

  const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const approvedHours = filteredEntries.filter((entry) => entry.isApproved).reduce((sum, e) => sum + e.hours, 0);
  const pendingHours = totalHours - approvedHours;

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (fromInput && toInput && fromInput > toInput) {
      setFilterError('"From" date must be on or before the "To" date.');
      return;
    }
    setFilterError(null);
    setAppliedFilters({ from: fromInput, to: toInput, projectId: projectInput });
    goToPage(1);
  };

  const handleFilterReset = () => {
    setFromInput('');
    setToInput('');
    setProjectInput(ALL_PROJECTS);
    setFilterError(null);
    setAppliedFilters({ from: '', to: '', projectId: ALL_PROJECTS });
    goToPage(1);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteEntry(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      // Surfaced via `deleteError` below; keep the dialog open so the user can retry or cancel.
    }
  };

  if (isLoading) {
    return (
      <p aria-live="polite" className="text-sm text-zinc-500">
        Loading timesheet history…
      </p>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <Alert variant="error">{error ?? 'Could not load timesheet history.'}</Alert>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
        <p className="text-sm text-zinc-600">No timesheet entries yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <HistoryStatCard
          label="Total hours logged"
          value={`${totalHours}h`}
          icon={Clock}
          iconClassName="bg-blue-100 text-blue-700"
        />
        <HistoryStatCard
          label="Approved hours"
          value={`${approvedHours}h`}
          icon={CheckCircle2}
          iconClassName="bg-green-100 text-green-700"
        />
        <HistoryStatCard
          label="Pending approval"
          value={`${pendingHours}h`}
          icon={Hourglass}
          iconClassName="bg-amber-100 text-amber-700"
        />
      </div>

      <form onSubmit={handleFilterSubmit} className="space-y-2" aria-label="Filter timesheet history">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4">
          <label htmlFor="history-from" className="sr-only">
            From
          </label>
          <div className="relative">
            <Calendar
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <Input
              id="history-from"
              type="date"
              value={fromInput}
              onChange={(event) => setFromInput(event.target.value)}
              aria-invalid={filterError ? true : undefined}
              aria-describedby={filterError ? 'history-filter-error' : undefined}
              className="w-auto pl-9"
            />
          </div>

          <span className="text-sm text-zinc-500" aria-hidden="true">
            to
          </span>

          <label htmlFor="history-to" className="sr-only">
            To
          </label>
          <div className="relative">
            <Calendar
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <Input
              id="history-to"
              type="date"
              value={toInput}
              onChange={(event) => setToInput(event.target.value)}
              aria-invalid={filterError ? true : undefined}
              aria-describedby={filterError ? 'history-filter-error' : undefined}
              className="w-auto pl-9"
            />
          </div>

          <label htmlFor="history-project" className="sr-only">
            Project
          </label>
          <Select
            id="history-project"
            className="w-auto"
            value={projectInput}
            onChange={(event) => setProjectInput(event.target.value)}
          >
            <option value={ALL_PROJECTS}>All Projects</option>
            {projectOptions.map((option) => (
              <option key={option.projectId} value={option.projectId}>
                {option.projectName}
              </option>
            ))}
          </Select>

          <div className="ml-auto flex items-center gap-2">
            <Button type="submit">Filter</Button>
            <Button type="button" variant="outline" onClick={handleFilterReset}>
              Reset
            </Button>
          </div>
        </div>
        {filterError && (
          <p id="history-filter-error" role="alert" className="text-sm text-red-600">
            {filterError}
          </p>
        )}
      </form>

      {(approveError || deleteError) && <Alert variant="error">{approveError ?? deleteError}</Alert>}

      {isFetching && (
        <p aria-live="polite" className="text-xs text-zinc-400">
          Updating…
        </p>
      )}

      {filteredEntries.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
          <p className="text-sm text-zinc-600">No timesheet entries match these filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200">
          <table className="w-full min-w-max text-left text-sm">
            <caption className="sr-only">Timesheet entry history with approval status.</caption>
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                {canApprove && (
                  <th scope="col" className="px-4 py-3 font-medium">
                    User
                  </th>
                )}
                <th scope="col" className="px-4 py-3 font-medium">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Project
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Hours
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Task description
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredEntries.map((entry) => {
                const isOwnEntry = entry.userId === user?.id;
                return (
                  <tr key={entry.id} className="transition-colors hover:bg-zinc-50">
                    {canApprove && (
                      <td className="px-4 py-3 text-zinc-700">
                        <p>{entry.userName}</p>
                        {entry.resourceRoleTypeName && (
                          <p className="text-xs font-normal text-zinc-500">{entry.resourceRoleTypeName}</p>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-zinc-600">{formatDate(entry.entryDate)}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      <p className="font-medium text-zinc-900">{entry.projectName}</p>
                      {entry.projectCode && <p className="text-xs text-zinc-500">{entry.projectCode}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900">{entry.hours}</span>{' '}
                      <span className="text-zinc-500">hrs</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-zinc-600">{entry.taskDescription || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                          entry.isApproved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 shrink-0 rounded-full',
                            entry.isApproved ? 'bg-green-600' : 'bg-amber-600'
                          )}
                          aria-hidden="true"
                        />
                        {entry.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const canEdit = isOwnEntry;
                        const canApproveThis = !isOwnEntry && canApprove && !entry.isApproved;
                        const canDelete = !entry.isApproved && (isOwnEntry || canApprove);
                        const hasAction = canEdit || canApproveThis || canDelete;

                        return (
                          <div className="flex min-h-8 flex-wrap items-center justify-end gap-1.5">
                            {canEdit && (
                              <Link
                                href={`/timesheets?week=${getMondayOfWeek(new Date(`${entry.entryDate}T00:00:00.000Z`))}`}
                                className={ACTION_LINK_CLASSNAME}
                                title={
                                  entry.isApproved
                                    ? 'Editing this entry resets it to Pending Approval for re-review.'
                                    : undefined
                                }
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                Edit
                              </Link>
                            )}
                            {canApproveThis && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-green-200 text-green-700 hover:bg-green-50"
                                isLoading={isApproving}
                                onClick={() => {
                                  resetApproveError();
                                  void approveEntry(entry.id);
                                }}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                Approve
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  resetDeleteError();
                                  setPendingDelete(entry);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                Delete
                              </Button>
                            )}
                            {!hasAction && (
                              <span className="inline-flex items-center gap-1.5 text-sm text-zinc-400">
                                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                                Locked
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        pageNo={pageNo}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={goToPage}
        isLoading={isFetching}
        itemLabel="entries"
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete timesheet entry"
        description={
          pendingDelete
            ? `Are you sure you want to delete the ${pendingDelete.hours}h entry for ${pendingDelete.projectName} on ${formatDate(pendingDelete.entryDate)}? This cannot be undone.`
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
