'use client';

import { AlertTriangle, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { TimesheetGridRow } from '@/components/tables/TimesheetGridRow';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { useTimesheetGrid } from '@/hooks/useTimesheetGrid';
import { useTimesheetPeriods } from '@/hooks/useTimesheetPeriods';
import { WEEKLY_HOURS_TARGET } from '@/lib/constants/timesheet.constants';
import { cn } from '@/lib/utils/cn';
import {
  formatDayHeader,
  formatDayLabel,
  formatWeekRangeLabel,
  getLocalDateString,
  getMondayOfWeek,
  isValidDateString,
} from '@/lib/utils/week';

/** "Feb 24 – Mar 2, 2025"-style label for a Timesheet Period option, independent of the grid's Mon-Sun week label. */
function formatPeriodOptionLabel(periodStart: string, periodEnd: string): string {
  const format = (value: string) =>
    new Date(`${value}T00:00:00.000Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  return `${format(periodStart)} – ${format(periodEnd)}`;
}

/**
 * Resolves the grid's initial week from a `?week=YYYY-MM-DD` search param
 * (used by the "Edit" link on `/timesheets/history` to jump straight to the
 * week containing a given entry) - any other/missing/invalid value falls
 * back to the current week (`useTimesheetGrid`'s own default).
 */
function useInitialWeekFromSearchParams(): string | undefined {
  const searchParams = useSearchParams();
  const weekParam = searchParams.get('week');
  if (!weekParam || !isValidDateString(weekParam)) return undefined;
  return getMondayOfWeek(new Date(`${weekParam}T00:00:00.000Z`));
}

/**
 * The `/timesheets` "My Timesheets" page: a "Create Timesheet" Timesheet
 * Period dropdown (populated from `useTimesheetPeriods`, i.e.
 * `GET /api/timesheets/periods`) above a Monday-Sunday weekly grid of hour
 * inputs per active project the signed-in user is themselves assigned to
 * (see `app/api/timesheets/week/route.ts`), so the default project rows and
 * total hours reflect the caller's own assignments, an auto-calculated
 * daily-total row, and
 * expandable per-project rows to view/edit that day's task notes (see
 * `docs/HR_System_FE_wireframe.pdf`'s `/timesheets` screen). Selecting a
 * period jumps the grid to the week containing that period's start date
 * (`goToPeriod`); the dropdown's own selection then stays in sync with
 * whichever period the fetched week resolves to, including when navigating
 * with the Previous/Next/This week controls. Handles loading, error, "no
 * timesheet period configured", locked-period, and empty (no active
 * projects) states, plus independent loading/error/empty states for the
 * period dropdown itself.
 *
 * Timesheet entry is allowed for today and any earlier date within the
 * loaded week, but never for a future date: every column up to and
 * including the one matching `today` (the caller's own local date, via
 * `getLocalDateString`) accepts input, while later columns are rendered
 * read-only via `TimesheetGridRow`'s `today` prop, and
 * `handleHoursChange`/`handleNotesChange` below additionally guard against
 * ever forwarding an edit for a future date to `setCell`, so the
 * restriction holds even if a disabled control were somehow still
 * triggered. The "Today" column is visually flagged in the header, and an
 * info banner explains the rule whenever the grid is otherwise editable.
 */
export function TimesheetGrid() {
  const initialWeekStart = useInitialWeekFromSearchParams();
  const {
    weekStart,
    weekDates,
    rows,
    dailyTotals,
    dailyHoursWarningThreshold,
    period,
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
    goToPeriod,
    refetch,
  } = useTimesheetGrid(initialWeekStart);

  const {
    periods,
    isLoading: isLoadingPeriods,
    isError: isPeriodsError,
    error: periodsError,
    refetch: refetchPeriods,
  } = useTimesheetPeriods();

  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(new Set());
  const weekTotal = dailyTotals.reduce((sum, total) => sum + total, 0);

  // Resolved once per render from the caller's own local clock - the single
  // source of truth for "which day may be edited" throughout this component
  // and `TimesheetGridRow`.
  const today = getLocalDateString();

  function handleHoursChange(projectId: string, date: string, value: string) {
    if (date > today) return;
    setCell(projectId, date, { hoursInput: value });
  }

  function handleNotesChange(projectId: string, date: string, value: string) {
    if (date > today) return;
    setCell(projectId, date, { taskDescription: value });
  }

  function handlePeriodChange(event: ChangeEvent<HTMLSelectElement>) {
    const selected = periods.find((candidate) => candidate.id === event.target.value);
    if (selected) {
      goToPeriod(selected);
    }
  }

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
      <div className="rounded-md border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <CalendarRange size={18} className="text-zinc-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-zinc-900">Create Timesheet</h2>
        </div>
        <p className="mb-3 text-sm text-zinc-500">
          Choose a timesheet period to load its date range and log hours for that period.
        </p>

        {isPeriodsError && (
          <div className="mb-3 space-y-2">
            <Alert variant="error">{periodsError ?? 'Could not load timesheet periods.'}</Alert>
            <Button type="button" variant="outline" size="sm" onClick={() => refetchPeriods()}>
              Try again
            </Button>
          </div>
        )}

        {!isPeriodsError && !isLoadingPeriods && periods.length === 0 && (
          <div className="mb-3">
            <Alert variant="info">
              No timesheet periods have been created yet. Contact your administrator to set one up.
            </Alert>
          </div>
        )}

        <div className="max-w-sm">
          <Label htmlFor="timesheetPeriod">Timesheet Period</Label>
          <Select
            id="timesheetPeriod"
            value={period?.id ?? ''}
            onChange={handlePeriodChange}
            disabled={isLoadingPeriods || isPeriodsError || periods.length === 0}
            aria-describedby="timesheetPeriod-hint"
          >
            <option value="">
              {isLoadingPeriods ? 'Loading periods…' : 'Select a timesheet period…'}
            </option>
            {periods.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {formatPeriodOptionLabel(candidate.periodStart, candidate.periodEnd)}
                {candidate.isLocked ? ' (Locked)' : ''}
              </option>
            ))}
          </Select>
          <p id="timesheetPeriod-hint" className="mt-1 text-xs text-zinc-500">
            Selecting a period jumps the grid below to its date range.
          </p>
        </div>
      </div>

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
      {canEdit && rows.length > 0 && (
        <Alert variant="info">
          You can log hours and notes for today, <strong>{formatDayLabel(today)}</strong>, and any earlier date.
          Future dates are shown read-only.
        </Alert>
      )}

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
          <p className="text-sm text-zinc-600">
            No active projects are available to log time against. You are not currently assigned to any active
            project - contact your project admin to get assigned.
          </p>
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
                  const isToday = date === today;
                  return (
                    <th
                      key={date}
                      scope="col"
                      className={cn('px-2 py-3 text-center font-medium', isToday && 'bg-blue-50 text-blue-800')}
                    >
                      <span className="block">{weekday}</span>
                      <span
                        className={cn(
                          'block font-normal normal-case text-zinc-400',
                          isToday && 'text-blue-600'
                        )}
                      >
                        {monthDay}
                      </span>
                      {isToday && (
                        <span className="mt-0.5 inline-block rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-blue-700">
                          Today
                        </span>
                      )}
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
                  today={today}
                  onHoursChange={(date, value) => handleHoursChange(row.projectId, date, value)}
                  onNotesChange={(date, value) => handleNotesChange(row.projectId, date, value)}
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
