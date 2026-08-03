'use client';

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { useProjectFilterOptions } from '@/hooks/useProjectFilterOptions';
import { useUserRolesSummary } from '@/hooks/useUserRolesSummary';
import { useExportUserRolesSummary } from '@/hooks/useExportUserRolesSummary';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { REPORT_EXPORT_FORMAT_LABELS, REPORT_EXPORT_FORMATS } from '@/lib/constants/report.constants';
import { getCurrentMonthDateRange } from '@/lib/utils/dateRange';
import type { UserRolesSummaryFilters } from '@/lib/api/reports.api';

const ALL_PROJECTS = 'all';

/**
 * The `/reports/roles-summary` summary table + horizontal bar chart
 * placeholder (`docs/HR_System_FE_wireframe.pdf`): a Date From/To + Project
 * filter (matching `TimesheetReportTable`'s filter bar UI/behavior - same
 * "Apply Filters"/"Reset" pair, and the Project filter cleared back to "All
 * Projects" on Reset), the Role/Users/Total Hours/Avg Hrs per User/% of
 * Total table (with a Total row), and an "Hours by Role" side panel
 * rendering each role's share as a plain proportional `<div>` bar - a
 * lightweight stand-in for a real charting library, matching the feature
 * brief's "horizontal bar chart placeholder" requirement without adding a
 * new dependency.
 *
 * The Project filter's own options come from `useProjectFilterOptions`,
 * which scopes them to a `ProjectAdmin` caller's own assigned projects
 * (`GetMyProjectList`) while a `SystemAdmin` still sees every project
 * (`GetProjectList`) - see that hook's doc comment. The selected
 * `projectId` is forwarded to both `GenerateUserRolesSummary`/
 * `GenerateMyUserRolesSummary` (via `useUserRolesSummary`) and
 * `ExportUserRolesSummary`/`ExportMyUserRolesSummary` (via
 * `useExportUserRolesSummary`), which both already accept an optional
 * `projectId` query param (see docs/HR_System_BE.postman_collection.json).
 */
export function UserRolesSummaryTable() {
  const defaultRange = useMemo(() => getCurrentMonthDateRange(), []);

  const [fromInput, setFromInput] = useState(defaultRange.from);
  const [toInput, setToInput] = useState(defaultRange.to);
  const [projectInput, setProjectInput] = useState(ALL_PROJECTS);
  const [appliedFilters, setAppliedFilters] = useState<UserRolesSummaryFilters>({
    startDate: defaultRange.from,
    endDate: defaultRange.to,
  });
  const [filterError, setFilterError] = useState<string | null>(null);

  const { projects } = useProjectFilterOptions();
  const { summary, isLoading, isError, error, refetch } = useUserRolesSummary(appliedFilters);
  const { exportReport, isExporting, error: exportError, reset: resetExportError } = useExportUserRolesSummary();

  const rows = summary?.summary ?? [];
  const grandTotalHours = summary?.grandTotalHours ?? 0;
  const maxHours = rows.reduce((max, row) => Math.max(max, row.totalHours), 0);

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
    setAppliedFilters({
      startDate: fromInput,
      endDate: toInput,
      projectId: projectInput === ALL_PROJECTS ? undefined : projectInput,
    });
  };

  const handleReset = () => {
    setFromInput(defaultRange.from);
    setToInput(defaultRange.to);
    setProjectInput(ALL_PROJECTS);
    setFilterError(null);
    setAppliedFilters({ startDate: defaultRange.from, endDate: defaultRange.to });
  };

  const handleExport = async (format: (typeof REPORT_EXPORT_FORMATS)[number]) => {
    resetExportError();
    try {
      await exportReport(appliedFilters, format);
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
            <label htmlFor="roles-summary-from" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Date From
            </label>
            <input
              id="roles-summary-from"
              type="date"
              value={fromInput}
              onChange={(event) => setFromInput(event.target.value)}
              aria-invalid={filterError ? true : undefined}
              aria-describedby={filterError ? 'roles-summary-filter-error' : undefined}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="roles-summary-to" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Date To
            </label>
            <input
              id="roles-summary-to"
              type="date"
              value={toInput}
              onChange={(event) => setToInput(event.target.value)}
              aria-invalid={filterError ? true : undefined}
              aria-describedby={filterError ? 'roles-summary-filter-error' : undefined}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="roles-summary-project" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Project
            </label>
            <Select
              id="roles-summary-project"
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
          <Button type="submit">Apply Filters</Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </form>
        {filterError && (
          <p id="roles-summary-filter-error" role="alert" className="text-sm text-red-600">
            {filterError}
          </p>
        )}
      </div>

      {isLoading && (
        <p aria-live="polite" className="text-sm text-zinc-500">
          Generating summary…
        </p>
      )}

      {isError && (
        <div className="space-y-3">
          <Alert variant="error">{error ?? 'Could not generate the user roles summary.'}</Alert>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
          <p className="text-sm text-zinc-600">No timesheet hours were logged in this date range.</p>
        </div>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="overflow-x-auto rounded-md border border-zinc-200 lg:col-span-2">
            <table className="w-full min-w-max text-left text-sm">
              <caption className="sr-only">Total hours grouped by user role.</caption>
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Users
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Total Hours
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Avg Hrs / User
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row) => {
                  const percentOfTotal = grandTotalHours > 0 ? (row.totalHours / grandTotalHours) * 100 : 0;
                  const avgHoursPerUser = row.userCount > 0 ? row.totalHours / row.userCount : 0;
                  return (
                    <tr key={row.resourceRoleType.id}>
                      <td className="px-4 py-3 font-medium text-zinc-900">{row.resourceRoleType.name}</td>
                      <td className="px-4 py-3 text-zinc-600">{row.userCount}</td>
                      <td className="px-4 py-3 text-zinc-600">{row.totalHours}h</td>
                      <td className="px-4 py-3 text-zinc-600">{avgHoursPerUser.toFixed(1)}h</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100" aria-hidden="true">
                            <div
                              className="h-full rounded-full bg-brand"
                              style={{ width: `${Math.min(percentOfTotal, 100)}%` }}
                            />
                          </div>
                          <span className="text-zinc-600">{percentOfTotal.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-zinc-200 bg-zinc-50 font-medium text-zinc-900">
                <tr>
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3">{rows.reduce((sum, row) => sum + row.userCount, 0)}</td>
                  <td className="px-4 py-3">{grandTotalHours}h</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-zinc-500" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-zinc-900">Hours by Role</h2>
            </div>
            <ul className="space-y-3" aria-label="Hours by role, horizontal bar chart">
              {rows.map((row) => {
                const barWidth = maxHours > 0 ? (row.totalHours / maxHours) * 100 : 0;
                return (
                  <li key={row.resourceRoleType.id}>
                    <div className="mb-1 flex items-center justify-between text-xs text-zinc-600">
                      <span>{row.resourceRoleType.name}</span>
                      <span className="font-medium text-zinc-900">{row.totalHours}h</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.max(barWidth, row.totalHours > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-center text-xs text-zinc-400">Chart visualization (placeholder)</p>
          </div>
        </div>
      )}
    </div>
  );
}
