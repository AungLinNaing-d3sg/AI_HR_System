'use client';

import { Info } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { HOURS_STEP, MAX_ENTRY_HOURS } from '@/lib/constants/timesheet.constants';
import { cn } from '@/lib/utils/cn';
import { formatDayLabel } from '@/lib/utils/week';
import type { TimesheetGridRowView } from '@/hooks/useTimesheetGrid';

export interface TimesheetGridRowProps {
  row: TimesheetGridRowView;
  isExpanded: boolean;
  onToggleExpand: () => void;
  disabled: boolean;
  onHoursChange: (date: string, value: string) => void;
  onNotesChange: (date: string, value: string) => void;
}

/**
 * One project row of the weekly grid: an hour input per day plus a row
 * total, and a toggleable sub-row (a "note strip" under each day column,
 * per the wireframe's "click the info icon to add task notes" hint - see
 * `docs/HR_System_FE_wireframe.pdf`) to view/edit that day's task notes.
 *
 * A cell whose entry is already Approved stays editable (only `disabled`,
 * e.g. a locked period, blocks it) - editing it resets it to Pending
 * Approval and requires the Project Admin to re-approve it, so an
 * "Approved" cell shows a hint explaining that instead of being locked out.
 */
export function TimesheetGridRow({
  row,
  isExpanded,
  onToggleExpand,
  disabled,
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

        {row.cells.map((cell) => (
          <td key={cell.date} className="px-2 py-3 align-top">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={row.maxDailyHours ?? MAX_ENTRY_HOURS}
              step={HOURS_STEP}
              value={cell.hoursInput}
              disabled={disabled}
              hasError={Boolean(cell.error)}
              placeholder="–"
              className="h-9 w-16 text-center"
              aria-label={`${formatDayLabel(cell.date)} hours for ${row.projectName}`}
              aria-describedby={
                cell.error
                  ? `${notesRowId}-${cell.date}-error`
                  : cell.isApproved
                    ? `${notesRowId}-${cell.date}-approved`
                    : undefined
              }
              onChange={(event) => onHoursChange(cell.date, event.target.value)}
            />
            {cell.error && (
              <p id={`${notesRowId}-${cell.date}-error`} role="alert" className="mt-1 text-xs text-red-600">
                {cell.error}
              </p>
            )}
            {!cell.error && cell.isApproved && (
              <p id={`${notesRowId}-${cell.date}-approved`} className="mt-1 text-xs text-zinc-400">
                Approved · editing resets to Pending
              </p>
            )}
          </td>
        ))}

        <td className={cn('px-4 py-3 text-right align-top text-sm font-semibold text-zinc-900')}>
          {row.totalHours}h
        </td>
      </tr>

      {isExpanded && (
        <tr id={notesRowId} className="bg-zinc-50">
          <th scope="row" className="px-4 py-3 text-left align-top text-xs font-medium text-zinc-500">
            Task notes
          </th>
          {row.cells.map((cell) => (
            <td key={cell.date} className="px-2 py-3 align-top">
              <Textarea
                value={cell.taskDescription}
                disabled={disabled}
                rows={2}
                placeholder="Add a note…"
                className="h-16 min-h-16 w-36 text-xs"
                aria-label={`Task notes for ${row.projectName} on ${formatDayLabel(cell.date)}`}
                onChange={(event) => onNotesChange(cell.date, event.target.value)}
              />
            </td>
          ))}
          <td />
        </tr>
      )}
    </>
  );
}
