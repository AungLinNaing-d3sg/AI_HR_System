'use client';

import { useTimesheetPeriods } from '@/hooks/useTimesheetPeriods';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

function formatDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Lists every timesheet period with its lock status, backing the `/timesheets/periods` page. */
export function TimesheetPeriodsTable() {
  const { periods, isLoading, isError, error, refetch } = useTimesheetPeriods();

  if (isLoading) {
    return (
      <p aria-live="polite" className="text-sm text-zinc-500">
        Loading timesheet periods…
      </p>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <Alert variant="error">{error ?? 'Could not load timesheet periods.'}</Alert>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-zinc-900">Timesheet Periods</h2>

      {periods.length === 0 ? (
        <p className="text-sm text-zinc-500">No timesheet periods have been created yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200">
          <table className="w-full min-w-max text-left text-sm">
            <caption className="sr-only">Timesheet periods with their lock status.</caption>
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Start date
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  End date
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {periods.map((period) => (
                <tr key={period.id}>
                  <td className="px-4 py-3 text-zinc-900">{formatDate(period.periodStart)}</td>
                  <td className="px-4 py-3 text-zinc-900">{formatDate(period.periodEnd)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        period.isLocked ? 'bg-zinc-200 text-zinc-700' : 'bg-green-100 text-green-800'
                      )}
                    >
                      {period.isLocked ? 'Locked' : 'Unlocked'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
