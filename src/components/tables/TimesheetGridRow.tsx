'use client';

import { Info } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { HOURS_STEP, MAX_ENTRY_HOURS, TASK_DESCRIPTION_MAX_LENGTH } from '@/lib/constants/timesheet.constants';
import { cn } from '@/lib/utils/cn';
import { formatDayLabel } from '@/lib/utils/week';
import type { TimesheetGridRowView } from '@/hooks/useTimesheetGrid';

export interface TimesheetGridRowProps {
  row: TimesheetGridRowView;
  isExpanded: boolean;
  onToggleExpand: () => void;
  disabled: boolean;
  /** Today's `YYYY-MM-DD` (caller's local calendar day) - today and any earlier day's cells accept input, see `TimesheetGrid`'s "Create Timesheet" doc comment. */
  today: string;
  onHoursChange: (date: string, value: string) => void;
  onNotesChange: (date: string, value: string) => void;
}

/**
 * One project row of the weekly grid: an hour input per day plus a row
 * total, and a toggleable sub-row (a "note strip" under each day column,
 * per the wireframe's "click the info icon to add task notes" hint - see
 * `docs/HR_System_FE_wireframe.pdf`) to view/edit that day's task notes.
 *
 * Every cell whose `date` is on or before `today` accepts input - only a
 * future date is shown read-only (still visible for reference, e.g. a
 * placeholder for an upcoming day) so timesheet entry can be made for
 * today or any earlier date in the period, never ahead of the calendar
 * (see `TimesheetGrid`'s "Create Timesheet" doc comment).
 *
 * A cell whose entry is already Approved stays editable *when it is not a
 * future date* (only `disabled`, e.g. a locked period, or the date being
 * in the future, blocks it) - editing it resets it to Pending Approval and
 * requires the Project Admin to re-approve it, per the latest
 * `UpdateTimesheetEntry` contract (see `useTimesheetGrid#saveAll`'s
 * comment), without surfacing that status inline on the cell itself.
 */
export function TimesheetGridRow({
  row,
  isExpanded,
  onToggleExpand,
  disabled,
  today,
  onHoursChange,
  onNotesChange,
}: TimesheetGridRowProps) {
  const notesRowId = `timesheet-notes-${row.projectId}`;

  return (
    <>
      <tr className="border-t border-zinc-100">
        <th scope="row" className="px-4 py-3 text-left align-top font-normal">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={onToggleExpand}
              aria-expanded={isExpanded}
              aria-controls={notesRowId}
              aria-label={`${isExpanded ? 'Hide' : 'Show'} task notes for ${row.projectName}`}
              className="mt-0.5 shrink-0 rounded p-0.5 text-zinc-400 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            >
              <Info size={16} aria-hidden="true" />
            </button>
            <div>
              <p className="text-sm font-medium text-zinc-900">{row.projectName}</p>
              {row.clientName && <p className="text-xs text-zinc-500">{row.clientName}</p>}
            </div>
          </div>
        </th>

        {row.cells.map((cell) => {
          const isFuture = cell.date > today;
          const cellDisabled = disabled || isFuture;
          const readOnlyHint = isFuture ? 'Read-only · entries cannot be logged for a future date' : undefined;

          return (
            <td key={cell.date} className="px-2 py-3 align-top">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={row.maxDailyHours ?? MAX_ENTRY_HOURS}
                step={HOURS_STEP}
                value={cell.hoursInput}
                disabled={cellDisabled}
                hasError={Boolean(cell.error)}
                placeholder="–"
                title={readOnlyHint}
                className="h-9 w-16 text-center"
                aria-label={`${formatDayLabel(cell.date)} hours for ${row.projectName}`}
                aria-describedby={cell.error ? `${notesRowId}-${cell.date}-error` : undefined}
                onChange={(event) => onHoursChange(cell.date, event.target.value)}
              />
              {cell.error && (
                <p id={`${notesRowId}-${cell.date}-error`} role="alert" className="mt-1 text-xs text-red-600">
                  {cell.error}
                </p>
              )}
            </td>
          );
        })}

        <td className={cn('px-4 py-3 text-right align-top text-sm font-semibold text-zinc-900')}>
          {row.totalHours}h
        </td>
      </tr>

      {isExpanded && (
        <tr id={notesRowId} className="bg-zinc-50">
          <th scope="row" className="px-4 py-3 text-left align-top text-xs font-medium text-zinc-500">
            Task Notes / Description
          </th>
          {row.cells.map((cell) => {
            const isFuture = cell.date > today;
            const cellDisabled = disabled || isFuture;

            return (
              <td key={cell.date} className="px-2 py-3 align-top">
                <Textarea
                  value={cell.taskDescription}
                  disabled={cellDisabled}
                  rows={3}
                  maxLength={TASK_DESCRIPTION_MAX_LENGTH}
                  placeholder="Describe the task worked on…"
                  title={isFuture ? 'Read-only · entries cannot be logged for a future date' : undefined}
                  className="h-24 min-h-24 w-52 resize-y text-sm leading-snug"
                  aria-label={`Task notes for ${row.projectName} on ${formatDayLabel(cell.date)}`}
                  onChange={(event) => onNotesChange(cell.date, event.target.value)}
                />
              </td>
            );
          })}
          <td />
        </tr>
      )}
    </>
  );
}
