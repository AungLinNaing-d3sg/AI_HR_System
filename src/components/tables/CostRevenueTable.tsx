'use client';

import { Fragment, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { DollarSign, Download, TrendingUp } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useMonthlyCostRevenue } from '@/hooks/useMonthlyCostRevenue';
import { useExportMonthlyCostRevenue } from '@/hooks/useExportMonthlyCostRevenue';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { REPORT_EXPORT_FORMAT_LABELS, REPORT_EXPORT_FORMATS } from '@/lib/constants/report.constants';
import { getCurrentYearMonth, parseMonthInputValue, toMonthInputValue } from '@/lib/utils/dateRange';
import { cn } from '@/lib/utils/cn';
import type { MonthlyCostRevenueFilters } from '@/lib/api/reports.api';

const ALL_PROJECTS = 'all';

function formatCurrency(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface KpiCardProps {
  label: string;
  value: string;
  icon: typeof DollarSign;
  iconClassName: string;
  badge?: string;
}

function KpiCard({ label, value, icon: Icon, iconClassName, badge }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-md', iconClassName)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="mt-3 text-2xl font-semibold text-zinc-900">{value}</p>
      <p className="text-sm text-zinc-500">
        {label}
        {badge && <span className="ml-2 text-xs font-medium text-green-600">{badge}</span>}
      </p>
    </div>
  );
}

/**
 * The `/reports/cost-revenue` KPI cards + cost/revenue table + chart
 * placeholder (`docs/HR_System_FE_wireframe.pdf`). The table's columns
 * deliberately differ from the wireframe's mockup (which shows a
 * per-resource "RESOURCE" column with a named user) - `GenerateMonthlyCostRevenue`'s
 * real, documented response (docs/HR_System_BE.postman_collection.json)
 * only returns a per-project `Breakdown` aggregated by resource *role type*,
 * with no per-user field to show, so the table here is built against that
 * actual API contract instead of fabricating a name the backend never
 * returns.
 */
export function CostRevenueTable() {
  const defaultYearMonth = useMemo(() => getCurrentYearMonth(), []);

  const [monthInput, setMonthInput] = useState(toMonthInputValue(defaultYearMonth.year, defaultYearMonth.month));
  const [projectInput, setProjectInput] = useState(ALL_PROJECTS);
  const [appliedFilters, setAppliedFilters] = useState<MonthlyCostRevenueFilters>(defaultYearMonth);
  const [filterError, setFilterError] = useState<string | null>(null);

  const { projects } = useProjects();
  const { report, isLoading, isError, error, refetch } = useMonthlyCostRevenue(appliedFilters);
  const { exportReport, isExporting, error: exportError, reset: resetExportError } = useExportMonthlyCostRevenue();

  const reportProjects = report?.projects ?? [];
  const currencySymbol = report?.currency.symbol ?? '';
  const totalHours = reportProjects.reduce((sum, project) => sum + project.totalHours, 0);
  const totalCost = reportProjects.reduce((sum, project) => sum + project.totalCost, 0);
  const totalRevenue = reportProjects.reduce((sum, project) => sum + project.totalRevenue, 0);
  const marginPercent = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
  const maxChartValue = reportProjects.reduce(
    (max, project) => Math.max(max, project.totalCost, project.totalRevenue),
    0
  );

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedMonth = parseMonthInputValue(monthInput);
    if (!parsedMonth) {
      setFilterError('Select a valid month.');
      return;
    }
    setFilterError(null);
    setAppliedFilters({
      year: parsedMonth.year,
      month: parsedMonth.month,
      projectId: projectInput === ALL_PROJECTS ? undefined : projectInput,
    });
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
            <label htmlFor="cost-revenue-month" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Month
            </label>
            <input
              id="cost-revenue-month"
              type="month"
              value={monthInput}
              onChange={(event) => setMonthInput(event.target.value)}
              aria-invalid={filterError ? true : undefined}
              aria-describedby={filterError ? 'cost-revenue-filter-error' : undefined}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="cost-revenue-project" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Project
            </label>
            <Select
              id="cost-revenue-project"
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
          <Button type="submit">Apply</Button>
        </form>
        {filterError && (
          <p id="cost-revenue-filter-error" role="alert" className="text-sm text-red-600">
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
          <Alert variant="error">{error ?? 'Could not generate the cost & revenue report.'}</Alert>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard label="Total Hours" value={`${totalHours}h`} icon={TrendingUp} iconClassName="bg-blue-100 text-blue-700" />
            <KpiCard
              label="Total Cost"
              value={formatCurrency(totalCost, currencySymbol)}
              icon={DollarSign}
              iconClassName="bg-red-100 text-red-700"
            />
            <KpiCard
              label="Total Revenue"
              value={formatCurrency(totalRevenue, currencySymbol)}
              icon={DollarSign}
              iconClassName="bg-green-100 text-green-700"
              badge={`Margin ${marginPercent.toFixed(0)}%`}
            />
          </div>

          {reportProjects.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
              <p className="text-sm text-zinc-600">No cost/revenue activity for this month.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="overflow-x-auto rounded-md border border-zinc-200 lg:col-span-2">
                <table className="w-full min-w-max text-left text-sm">
                  <caption className="sr-only">Monthly project cost and revenue, broken down by resource role.</caption>
                  <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Project
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Role
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Hours
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Cost Rate/Day
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Billing Rate/Day
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Cost ({report?.currency.code})
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Revenue ({report?.currency.code})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {reportProjects.map((project) => (
                      <Fragment key={project.project.id}>
                        {project.breakdown.map((row, index) => (
                          <tr key={`${project.project.id}-${row.resourceRoleType}-${index}`}>
                            <td className="px-4 py-3 text-zinc-700">
                              <span className="font-medium text-zinc-900">{project.project.name}</span>{' '}
                              <span className="font-mono text-xs text-zinc-500">{project.project.code}</span>
                            </td>
                            <td className="px-4 py-3 text-zinc-600">{row.resourceRoleType}</td>
                            <td className="px-4 py-3 text-zinc-600">{row.hours}h</td>
                            <td className="px-4 py-3 text-zinc-600">{formatCurrency(row.costRate, currencySymbol)}</td>
                            <td className="px-4 py-3 text-zinc-600">
                              {formatCurrency(row.billingRate, currencySymbol)}
                            </td>
                            <td className="px-4 py-3 text-zinc-600">{formatCurrency(row.cost, currencySymbol)}</td>
                            <td className="px-4 py-3 text-zinc-600">{formatCurrency(row.revenue, currencySymbol)}</td>
                          </tr>
                        ))}
                        <tr key={`${project.project.id}-subtotal`} className="bg-zinc-50 font-medium text-zinc-900">
                          <td className="px-4 py-2" colSpan={2}>
                            Subtotal &mdash; {project.project.name}
                          </td>
                          <td className="px-4 py-2">{project.totalHours}h</td>
                          <td className="px-4 py-2" colSpan={2} />
                          <td className="px-4 py-2">{formatCurrency(project.totalCost, currencySymbol)}</td>
                          <td className="px-4 py-2">{formatCurrency(project.totalRevenue, currencySymbol)}</td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-zinc-200 bg-zinc-100 font-medium text-zinc-900">
                    <tr>
                      <td className="px-4 py-3" colSpan={2}>
                        Total
                      </td>
                      <td className="px-4 py-3">{totalHours}h</td>
                      <td className="px-4 py-3" colSpan={2} />
                      <td className="px-4 py-3">{formatCurrency(totalCost, currencySymbol)}</td>
                      <td className="px-4 py-3">{formatCurrency(totalRevenue, currencySymbol)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-zinc-900">Cost vs Revenue</h2>
                </div>
                <ul className="space-y-4" aria-label="Cost versus revenue by project, horizontal bar chart">
                  {reportProjects.map((project) => {
                    const costWidth = maxChartValue > 0 ? (project.totalCost / maxChartValue) * 100 : 0;
                    const revenueWidth = maxChartValue > 0 ? (project.totalRevenue / maxChartValue) * 100 : 0;
                    return (
                      <li key={project.project.id}>
                        <p className="mb-1 text-xs font-medium text-zinc-700">{project.project.name}</p>
                        <div className="mb-1 flex items-center gap-2">
                          <span className="w-14 text-xs text-zinc-500">Cost</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${costWidth}%` }} />
                          </div>
                          <span className="w-20 text-right text-xs text-zinc-600">
                            {formatCurrency(project.totalCost, currencySymbol)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-14 text-xs text-zinc-500">Revenue</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                            <div className="h-full rounded-full bg-green-500" style={{ width: `${revenueWidth}%` }} />
                          </div>
                          <span className="w-20 text-right text-xs text-zinc-600">
                            {formatCurrency(project.totalRevenue, currencySymbol)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-4 text-center text-xs text-zinc-400">Chart visualization (placeholder)</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
