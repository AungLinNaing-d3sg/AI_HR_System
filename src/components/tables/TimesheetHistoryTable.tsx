'use client';

import { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useApproveTimesheetEntry } from '@/hooks/useApproveTimesheetEntry';
import { useTimesheetHistory } from '@/hooks/useTimesheetHistory';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { cn } from '@/lib/utils/cn';
import type { TimesheetHistoryEntry } from '@/types/domain.types';

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const ALL_PROJECTS = 'all';

interface HistoryStatCardProps {
  label: string;
  value: string;
  iconClassName: string;
}

function HistoryStatCard({ label, value, iconClassName }: HistoryStatCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-md', iconClassName)}>
        <Clock className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="mt-3 text-2xl font-semibold text-zinc-900">{value}</p>
      <p className="text-sm text-zinc-500">{label}</p>
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
 * The `/timesheets/history` table: every visible entry with an
 * Approved/Pending badge (see `docs/HR_System_FE_wireframe.pdf`'s
 * `/timesheets/history` screen). `useTimesheetHistory` already scopes rows
 * by role server-side (own entries only for a plain `User`, every entry for
 * `ProjectAdmin`/`SystemAdmin`), so this component only adds the
 * User column and the Approve action for the roles that can see everyone's
 * entries.
 */
export function TimesheetHistoryTable() {
  const { role } = useAuth();
  const canApprove = Boolean(role && PROJECT_MANAGEMENT_ROLES.includes(role));

  const { entries, isLoading, isError, error, refetch } = useTimesheetHistory();
  const { approveEntry, isApproving, error: approveError, reset: resetApproveError } = useApproveTimesheetEntry();

  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [projectInput, setProjectInput] = useState(ALL_PROJECTS);
  const [appliedFilters, setAppliedFilters] = useState({ from: '', to: '', projectId: ALL_PROJECTS });

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
        <HistoryStatCard label="Total hours logged" value={`${totalHours}h`} iconClassName="bg-blue-100 text-blue-700" />
        <HistoryStatCard label="Approved hours" value={`${approvedHours}h`} iconClassName="bg-green-100 text-green-700" />
        <HistoryStatCard label="Pending approval" value={`${pendingHours}h`} iconClassName="bg-amber-100 text-amber-700" />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedFilters({ from: fromInput, to: toInput, projectId: projectInput });
        }}
        className="flex flex-wrap items-end gap-3 rounded-md border border-zinc-200 bg-white p-4"
      >
        <div>
          <label htmlFor="history-from" className="mb-1.5 block text-xs font-medium text-zinc-700">
            From
          </label>
          <input
            id="history-from"
            type="date"
            value={fromInput}
            onChange={(event) => setFromInput(event.target.value)}
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="history-to" className="mb-1.5 block text-xs font-medium text-zinc-700">
            To
          </label>
          <input
            id="history-to"
            type="date"
            value={toInput}
            onChange={(event) => setToInput(event.target.value)}
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="history-project" className="mb-1.5 block text-xs font-medium text-zinc-700">
            Project
          </label>
          <Select
            id="history-project"
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
        </div>
        <Button type="submit">Filter</Button>
      </form>

      {approveError && <Alert variant="error">{approveError}</Alert>}

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
                Project
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Date
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Hours
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Task notes
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              {canApprove && (
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredEntries.map((entry) => (
              <tr key={entry.id}>
                {canApprove && <td className="px-4 py-3 text-zinc-700">{entry.userName}</td>}
                <td className="px-4 py-3 text-zinc-700">
                  <span className="font-medium text-zinc-900">{entry.projectName}</span>
                  {entry.projectCode && <span className="ml-1 font-mono text-xs text-zinc-500">{entry.projectCode}</span>}
                </td>
                <td className="px-4 py-3 text-zinc-600">{formatDate(entry.entryDate)}</td>
                <td className="px-4 py-3 text-zinc-900">{entry.hours}h</td>
                <td className="px-4 py-3 max-w-xs truncate text-zinc-600">{entry.taskDescription || '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      entry.isApproved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    )}
                  >
                    {entry.isApproved ? 'Approved' : 'Pending'}
                  </span>
                </td>
                {canApprove && (
                  <td className="px-4 py-3 text-right">
                    {!entry.isApproved && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        isLoading={isApproving}
                        onClick={() => {
                          resetApproveError();
                          void approveEntry(entry.id);
                        }}
                      >
                        Approve
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
