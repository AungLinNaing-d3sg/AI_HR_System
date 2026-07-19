'use client';

import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { TimesheetGridRow } from '@/components/tables/TimesheetGridRow';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useTimesheetGrid } from '@/hooks/useTimesheetGrid';
import { WEEKLY_HOURS_TARGET } from '@/lib/constants/timesheet.constants';
import { cn } from '@/lib/utils/cn';
import { formatDayHeader, formatWeekRangeLabel } from '@/lib/utils/week';

/**
 * The `/timesheets` weekly grid: Monday-Sunday hour inputs per active
 * project, an auto-calculated daily-total row, and expandable per-project
 * rows to view/edit that day's task notes (see
 * `docs/HR_System_FE_wireframe.pdf`'s `/timesheets` screen). Handles
 * loading, error, "no timesheet period configured", locked-period, and
 * empty (no active projects) states.
 */
export function TimesheetGrid() {
  const {
    weekStart,
    weekDates,
    rows,
    dailyTotals,
    dailyHoursWarningThreshold,
    isLocked,
    hasPeriod,
    canEdit,
    isLoading,
    isError,
    error,
    isDirty,
    hasValidationErrors,
    isSaving,
    saveError,
    setCell,
    saveAll,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    refetch,
  } = useTimesheetGrid();

  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(new Set());
  const weekTotal = dailyTotals.reduce((sum, total) => sum + total, 0);

  function toggleExpanded(projectId: string) {
    setExpandedProjectIds((previous) => {
      const next = new Set(previous);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  if (isLoading) {
    return (
      <p aria-live="polite" className="text-sm text-zinc-500">
        Loading timesheet…
      </p>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <Alert variant="error">{error ?? 'Could not load the timesheet for this week.'}</Alert>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-8 p-0"
              onClick={goToPreviousWeek}
              aria-label="Go to the previous week"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </Button>
            <span className="min-w-40 text-center text-sm font-medium text-zinc-900">
              {formatWeekRangeLabel(weekStart)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-8 p-0"
              onClick={goToNextWeek}
              aria-label="Go to the next week"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={goToCurrentWeek}>
              This week
            </Button>
          </div>

          {rows.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="whitespace-nowrap">
                Week {weekTotal}h/{WEEKLY_HOURS_TARGET}h used
              </span>
              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-200">
                <span
                  className="block h-full rounded-full bg-brand"
                  style={{ width: `${Math.min(100, (weekTotal / WEEKLY_HOURS_TARGET) * 100)}%` }}
                />
              </span>
            </div>
          )}
        </div>

        <Button
          type="button"
          onClick={() => void saveAll()}
          isLoading={isSaving}
          disabled={!canEdit || !isDirty || hasValidationErrors || isSaving}
        >
          {isSaving ? 'Saving…' : 'Save All'}
        </Button>
      </div>

      {saveError && <Alert variant="error">{saveError}</Alert>}
      {!hasPeriod && (
        <Alert variant="info">
          No timesheet period has been set up for this week yet. Contact your administrator to log hours for this
          period.
        </Alert>
      )}
      {hasPeriod && isLocked && (
        <Alert variant="info">This timesheet period is locked and can no longer be edited.</Alert>
      )}

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
          <p className="text-sm text-zinc-600">No active projects are available to log time against.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200">
          <table className="w-full min-w-max text-left text-sm">
            <caption className="sr-only">
              Weekly timesheet grid for {formatWeekRangeLabel(weekStart)}, with one row per project and hour inputs
              for each day.
            </caption>
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Project
                </th>
                {weekDates.map((date) => {
                  const { weekday, monthDay } = formatDayHeader(date);
                  return (
                    <th key={date} scope="col" className="px-2 py-3 text-center font-medium">
                      <span className="block">{weekday}</span>
                      <span className="block font-normal normal-case text-zinc-400">{monthDay}</span>
                    </th>
                  );
                })}
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row) => (
                <TimesheetGridRow
                  key={row.projectId}
                  row={row}
                  isExpanded={expandedProjectIds.has(row.projectId)}
                  onToggleExpand={() => toggleExpanded(row.projectId)}
                  disabled={!canEdit}
                  onHoursChange={(date, value) => setCell(row.projectId, date, { hoursInput: value })}
                  onNotesChange={(date, value) => setCell(row.projectId, date, { taskDescription: value })}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-zinc-200 bg-zinc-50 font-semibold text-zinc-900">
                <th scope="row" className="px-4 py-3 text-left">
                  Daily Total
                </th>
                {dailyTotals.map((total, index) => {
                  const exceedsThreshold = total > dailyHoursWarningThreshold;
                  return (
                    <td key={weekDates[index]} className="px-2 py-3 text-center">
                      <span className={cn('inline-flex items-center gap-1', exceedsThreshold && 'text-amber-700')}>
                        {exceedsThreshold && (
                          <AlertTriangle
                            size={14}
                            aria-label={`Daily total exceeds ${dailyHoursWarningThreshold} hours`}
                          />
                        )}
                        {total}h
                      </span>
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right">{weekTotal}h</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <p className="text-xs text-zinc-500">
          A <AlertTriangle size={12} className="inline-block align-text-bottom" aria-hidden="true" /> icon flags a
          day whose total exceeds {dailyHoursWarningThreshold}h. Click the{' '}
          <span className="font-medium text-zinc-700">info icon</span> next to a project to view or edit that
          project&apos;s task notes for the week.
        </p>
      )}
    </div>
  );
}
