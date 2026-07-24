'use client';

import { useCallback, useMemo, useState } from 'react';
import { useCreateTimesheetEntry } from '@/hooks/useCreateTimesheetEntry';
import { useTimesheetWeek } from '@/hooks/useTimesheetWeek';
import { useUpdateTimesheetEntry } from '@/hooks/useUpdateTimesheetEntry';
import { DAILY_HOURS_WARNING_THRESHOLD, MAX_ENTRY_HOURS } from '@/lib/constants/timesheet.constants';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { buildTimesheetGrid, calculateDailyTotals, type TimesheetGridCell } from '@/lib/utils/timesheetGrid';
import { addDays, getMondayOfWeek, getWeekDates } from '@/lib/utils/week';
import { timesheetCellSchema } from '@/lib/validators/timesheet.validators';
import type { TimesheetPeriod } from '@/types/domain.types';

export interface TimesheetGridCellView extends TimesheetGridCell {
  /** Raw, possibly-in-progress input string (kept separate from `hours` so an emptied field doesn't snap back to "0" while typing). */
  hoursInput: string;
  /** Client-side validation message for the current pending edit, if any. */
  error: string | null;
  isDirty: boolean;
}

export interface TimesheetGridRowView {
  projectId: string;
  projectCode: string;
  projectName: string;
  clientName: string | null;
  maxDailyHours: number | null;
  cells: TimesheetGridCellView[];
  totalHours: number;
}

interface PendingCellEdit {
  hoursInput: string;
  taskDescription: string;
  error: string | null;
}

/** projectId -> date -> pending edit not yet saved to the backend. */
type PendingEdits = Record<string, Record<string, PendingCellEdit>>;

function countPendingEdits(edits: PendingEdits): number {
  return Object.values(edits).reduce((total, byDate) => total + Object.keys(byDate).length, 0);
}

/**
 * Drives the `/timesheets` weekly grid: week navigation, joining the
 * combined `useTimesheetWeek` read model into per-project/per-day rows,
 * tracking locally-edited (not-yet-saved) cells with inline validation, and
 * batching all pending edits into create/update calls on `saveAll`.
 */
export function useTimesheetGrid(initialWeekStart?: string) {
  const [weekStart, setWeekStart] = useState<string>(() => initialWeekStart ?? getMondayOfWeek());
  // The "Timesheet Period" dropdown's explicit selection (see `goToPeriod`),
  // cleared on any plain week navigation (Previous/Next/This week) so those
  // fall back to re-deriving the covering period from the new week's date
  // range - see `useTimesheetWeek`/`app/api/timesheets/week/route.ts` for why
  // this is required for every period option to be selectable, not just the
  // one that a plain overlap lookup alone would resolve to.
  const [periodId, setPeriodId] = useState<string | undefined>(undefined);
  const [edits, setEdits] = useState<PendingEdits>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { week, isLoading, isError, error, refetch } = useTimesheetWeek(weekStart, periodId);
  const { createEntry } = useCreateTimesheetEntry();
  const { updateEntry } = useUpdateTimesheetEntry();

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const baseRows = useMemo(
    () => (week ? buildTimesheetGrid(week.projects, week.entries, weekStart) : []),
    [week, weekStart]
  );

  const rows = useMemo<TimesheetGridRowView[]>(() => {
    return baseRows.map((row) => {
      const cells: TimesheetGridCellView[] = row.cells.map((cell) => {
        const edit = edits[row.projectId]?.[cell.date];
        if (!edit) {
          return {
            ...cell,
            hoursInput: cell.hours === 0 ? '' : String(cell.hours),
            error: null,
            isDirty: false,
          };
        }
        return {
          ...cell,
          hours: edit.hoursInput === '' ? 0 : Number(edit.hoursInput),
          taskDescription: edit.taskDescription,
          hoursInput: edit.hoursInput,
          error: edit.error,
          isDirty: true,
        };
      });

      const totalHours = Math.round(cells.reduce((sum, cell) => sum + cell.hours, 0) * 100) / 100;

      return { ...row, cells, totalHours };
    });
  }, [baseRows, edits]);

  const dailyTotals = useMemo(() => calculateDailyTotals(rows, weekStart), [rows, weekStart]);

  const isDirty = useMemo(() => countPendingEdits(edits) > 0, [edits]);
  const hasValidationErrors = useMemo(
    () => Object.values(edits).some((byDate) => Object.values(byDate).some((edit) => edit.error)),
    [edits]
  );

  const resetEdits = useCallback(() => {
    setEdits({});
    setSaveError(null);
  }, []);

  const setCell = useCallback(
    (
      projectId: string,
      date: string,
      patch: Partial<{ hoursInput: string; taskDescription: string }>
    ) => {
      const row = baseRows.find((candidate) => candidate.projectId === projectId);
      const baseCell = row?.cells.find((candidate) => candidate.date === date);

      setEdits((previous) => {
        const existing = previous[projectId]?.[date];
        const nextHoursInput =
          patch.hoursInput ?? existing?.hoursInput ?? (baseCell && baseCell.hours !== 0 ? String(baseCell.hours) : '');
        const nextTaskDescription = patch.taskDescription ?? existing?.taskDescription ?? baseCell?.taskDescription ?? '';

        const maxHours = row?.maxDailyHours ?? MAX_ENTRY_HOURS;
        const validation = timesheetCellSchema.safeParse({
          hours: nextHoursInput,
          taskDescription: nextTaskDescription,
        });

        let fieldError: string | null = null;
        if (!validation.success) {
          fieldError = validation.error.issues[0]?.message ?? 'Invalid value.';
        } else if (validation.data.hours > maxHours) {
          fieldError = `Hours cannot exceed ${maxHours} for this project.`;
        }

        return {
          ...previous,
          [projectId]: {
            ...previous[projectId],
            [date]: { hoursInput: nextHoursInput, taskDescription: nextTaskDescription, error: fieldError },
          },
        };
      });
    },
    [baseRows]
  );

  const goToPreviousWeek = useCallback(() => {
    resetEdits();
    setPeriodId(undefined);
    setWeekStart((current) => addDays(current, -7));
  }, [resetEdits]);

  const goToNextWeek = useCallback(() => {
    resetEdits();
    setPeriodId(undefined);
    setWeekStart((current) => addDays(current, 7));
  }, [resetEdits]);

  const goToCurrentWeek = useCallback(() => {
    resetEdits();
    setPeriodId(undefined);
    setWeekStart(getMondayOfWeek());
  }, [resetEdits]);

  /**
   * Jumps the grid to the week containing `period`'s start date - the
   * "Timesheet Period" dropdown's selection handler. Also pins `periodId` to
   * this exact period (see `useTimesheetWeek`), so the resolved week's
   * period always matches the option the caller picked even when another
   * period also overlaps that same week. Entries then load for whichever
   * week that resolves to, and `hasPeriod`/`canEdit` reflect the chosen
   * period (or a locked one) as soon as the fetch settles.
   */
  const goToPeriod = useCallback(
    (period: TimesheetPeriod) => {
      resetEdits();
      setPeriodId(period.id);
      setWeekStart(getMondayOfWeek(new Date(`${period.periodStart}T00:00:00.000Z`)));
    },
    [resetEdits]
  );

  const isLocked = Boolean(week?.period?.isLocked);
  const hasPeriod = Boolean(week?.period);
  const canEdit = hasPeriod && !isLocked;

  const saveAll = useCallback(async () => {
    if (!week?.period || hasValidationErrors || !isDirty) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      for (const [projectId, byDate] of Object.entries(edits)) {
        for (const [date, edit] of Object.entries(byDate)) {
          const row = baseRows.find((candidate) => candidate.projectId === projectId);
          const cell = row?.cells.find((candidate) => candidate.date === date);
          if (!cell) continue;

          // An already-approved cell is still editable, not skipped: per the
          // latest `UpdateTimesheetEntry` contract, editing it resets it to
          // Pending Approval on the backend, requiring Project Admin
          // re-approval - see `TimesheetGridRow`'s "Approved" hint.
          const hours = edit.hoursInput === '' ? 0 : Number(edit.hoursInput);
          const taskDescription = edit.taskDescription;

          if (cell.entryId) {
            // Entries are saved sequentially (not Promise.all'd) so a failure is attributable to one cell.
            await updateEntry({ id: cell.entryId, values: { hours, taskDescription } });
          } else if (hours > 0) {
            await createEntry({
              projectId,
              timesheetPeriodId: week.period.id,
              entryDate: date,
              hours,
              taskDescription,
            });
          }
        }
      }
      resetEdits();
      await refetch();
    } catch (mutationError) {
      setSaveError(getApiErrorMessage(mutationError, 'Could not save one or more timesheet entries.'));
    } finally {
      setIsSaving(false);
    }
  }, [week, edits, baseRows, hasValidationErrors, isDirty, updateEntry, createEntry, refetch, resetEdits]);

  return {
    weekStart,
    weekEnd: week?.weekEnd ?? addDays(weekStart, 6),
    weekDates,
    rows,
    dailyTotals,
    dailyHoursWarningThreshold: DAILY_HOURS_WARNING_THRESHOLD,
    period: week?.period ?? null,
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
  };
}
