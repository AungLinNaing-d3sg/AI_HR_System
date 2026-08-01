'use client';

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Download } from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { useProjectFilterOptions } from '@/hooks/useProjectFilterOptions';
import { useTimesheetReport } from '@/hooks/useTimesheetReport';
import { useExportTimesheetReport } from '@/hooks/useExportTimesheetReport';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/common/Pagination';
import { REPORT_EXPORT_FORMAT_LABELS, REPORT_EXPORT_FORMATS } from '@/lib/constants/report.constants';
import { getCurrentMonthDateRange } from '@/lib/utils/dateRange';
import { cn } from '@/lib/utils/cn';
import type { TimesheetReportFilters } from '@/lib/api/reports.api';
import type { TimesheetReportItem } from '@/types/domain.types';

const ALL_PROJECTS = 'all';
const ALL_USERS = 'all';

function formatDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

interface UserOption {
  userId: string;
  fullName: string;
}

function getUserOptions(items: TimesheetReportItem[]): UserOption[] {
  const byId = new Map<string, string>();
  for (const item of items) {
    if (!byId.has(item.user.id)) byId.set(item.user.id, item.user.fullName);
  }
  return Array.from(byId, ([userId, fullName]) => ({ userId, fullName }));
}

/**
 * The `/reports/timesheet` filter bar + data table
 * (`docs/HR_System_FE_wireframe.pdf`): Date From/To + Project + User filters,
 * an "Export CSV"/"Export Excel" pair (the backend only supports xlsx/csv -
 * see `lib/constants/report.constants.ts` - so this deliberately does not
 * offer the wireframe's "Export PDF" label, which the real API has no
 * matching capability for), and the User/Project/Date/Hours/Task
 * Description/Status columns `GenerateTimesheetReport` returns.
 *
 * `userId` is filtered client-side (over the date+project-scoped result set)
 * rather than sent to the backend, because there is no "list all users"
 * reference endpoint to populate the dropdown from ahead of a fetch - the
 * same documented workaround `UnassignedUser` uses elsewhere in this app.
 *
 * The Project filter's own options come from `useProjectFilterOptions`,
 * which scopes them to a `ProjectAdmin` caller's own assigned projects
 * (`GetMyProjectList`) while a `SystemAdmin` still sees every project
 * (`GetProjectList`) - see that hook's doc comment.
 */
export function TimesheetReportTable() {
  const defaultRange = useMemo(() => getCurrentMonthDateRange(), []);

  const [fromInput, setFromInput] = useState(defaultRange.from);
  const [toInput, setToInput] = useState(defaultRange.to);
  const [projectInput, setProjectInput] = useState(ALL_PROJECTS);
  const [userInput, setUserInput] = useState(ALL_USERS);
  const [appliedFilters, setAppliedFilters] = useState<TimesheetReportFilters>({
    startDate: defaultRange.from,
    endDate: defaultRange.to,
  });
  const [filterError, setFilterError] = useState<string | null>(null);

  const { projects } = useProjectFilterOptions();
  const { pageNo, pageSize, goToPage } = usePagination();
  const { report, isLoading, isError, error, refetch } = useTimesheetReport(
    appliedFilters ? { ...appliedFilters, pageNo, pageSize } : null
  );
  const { exportReport, isExporting, error: exportError, reset: resetExportError } = useExportTimesheetReport();

  const items = useMemo(() => report?.items ?? [], [report]);
  const userOptions = useMemo(() => getUserOptions(items), [items]);
  const filteredItems = useMemo(
    () => (userInput === ALL_USERS ? items : items.filter((item) => item.user.id === userInput)),
    [items, userInput]
  );
  // Report-wide total (unaffected by which page is currently shown) - see
  // `TimesheetReportResponseDto.TotalHours` in `types/api.types.ts`.
  const totalHours = report?.totalHours ?? 0;

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fromInput || !toInput) {
      setFilterError('Both Date From and Date To are required.');
      return;
    }
    if (fromInput > toInput) {
      setFilterError('"Date From" must be on or before "Date To".');
      return;
    }
    setFilterError(null);
    setUserInput(ALL_USERS);
    setAppliedFilters({
      startDate: fromInput,
      endDate: toInput,
      projectId: projectInput === ALL_PROJECTS ? undefined : projectInput,
    });
    goToPage(1);
  };

  const handleReset = () => {
    setFromInput(defaultRange.from);
    setToInput(defaultRange.to);
    setProjectInput(ALL_PROJECTS);
    setUserInput(ALL_USERS);
    setFilterError(null);
    setAppliedFilters({ startDate: defaultRange.from, endDate: defaultRange.to });
    goToPage(1);
  };

  const handleExport = async (format: (typeof REPORT_EXPORT_FORMATS)[number]) => {
    resetExportError();
    try {
      await exportReport(
        {
          ...appliedFilters,
          userId: userInput === ALL_USERS ? undefined : userInput,
        },
        format
      );
    } catch {
      // Surfaced via `exportError` below.
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        {REPORT_EXPORT_FORMATS.map((format) => (
          <Button
            key={format}
            type="button"
            variant="outline"
            size="sm"
            isLoading={isExporting}
            onClick={() => handleExport(format)}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {REPORT_EXPORT_FORMAT_LABELS[format]}
          </Button>
        ))}
      </div>

      {exportError && <Alert variant="error">{exportError}</Alert>}

      <div className="space-y-2">
        <form
          onSubmit={handleFilterSubmit}
          className="flex flex-wrap items-end gap-3 rounded-md border border-zinc-200 bg-white p-4"
        >
          <div>
            <label htmlFor="report-from" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Date From
            </label>
            <input
              id="report-from"
              type="date"
              value={fromInput}
              onChange={(event) => setFromInput(event.target.value)}
              aria-invalid={filterError ? true : undefined}
              aria-describedby={filterError ? 'report-filter-error' : undefined}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="report-to" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Date To
            </label>
            <input
              id="report-to"
              type="date"
              value={toInput}
              onChange={(event) => setToInput(event.target.value)}
              aria-invalid={filterError ? true : undefined}
              aria-describedby={filterError ? 'report-filter-error' : undefined}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="report-project" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Project
            </label>
            <Select
              id="report-project"
              className="w-auto"
              value={projectInput}
              onChange={(event) => setProjectInput(event.target.value)}
            >
              <option value={ALL_PROJECTS}>All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="report-user" className="mb-1.5 block text-xs font-medium text-zinc-500">
              User
            </label>
            <Select
              id="report-user"
              className="w-auto"
              value={userInput}
              onChange={(event) => setUserInput(event.target.value)}
            >
              <option value={ALL_USERS}>All Users</option>
              {userOptions.map((option) => (
                <option key={option.userId} value={option.userId}>
                  {option.fullName}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit">Apply Filters</Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </form>
        {filterError && (
          <p id="report-filter-error" role="alert" className="text-sm text-red-600">
            {filterError}
          </p>
        )}
      </div>

      {isLoading && (
        <p aria-live="polite" className="text-sm text-zinc-500">
          Generating report…
        </p>
      )}

      {isError && (
        <div className="space-y-3">
          <Alert variant="error">{error ?? 'Could not generate the timesheet report.'}</Alert>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <p className="text-sm text-zinc-500">
            Showing <span className="font-medium text-zinc-900">{filteredItems.length}</span>{' '}
            {filteredItems.length === 1 ? 'entry' : 'entries'} on this page &middot; Total hours (all pages):{' '}
            <span className="font-medium text-zinc-900">{totalHours}h</span>
          </p>

          {filteredItems.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
              <p className="text-sm text-zinc-600">No timesheet entries match these filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-zinc-200">
              <table className="w-full min-w-max text-left text-sm">
                <caption className="sr-only">Timesheet report entries for the selected date range and filters.</caption>
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      User
                    </th>
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
                      Task Description
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredItems.map((item, index) => (
                    <tr key={`${item.user.id}-${item.project.id}-${item.entryDate}-${index}`}>
                      <td className="px-4 py-3 text-zinc-700">{item.user.fullName}</td>
                      <td className="px-4 py-3 text-zinc-700">
                        <span className="font-medium text-zinc-900">{item.project.name}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{formatDate(item.entryDate)}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-zinc-900">{item.hours}</span>{' '}
                        <span className="text-zinc-500">hrs</span>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-zinc-600">{item.taskDescription || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            item.isApproved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          )}
                        >
                          {item.isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            pageNo={pageNo}
            pageSize={pageSize}
            totalCount={report?.totalCount ?? 0}
            onPageChange={goToPage}
            isLoading={isLoading}
            itemLabel="entries"
          />
        </>
      )}
    </div>
  );
}
