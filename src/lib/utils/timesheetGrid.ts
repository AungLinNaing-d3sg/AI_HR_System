import { getWeekDates } from '@/lib/utils/week';
import type { Project, TimesheetEntry } from '@/types/domain.types';

export interface TimesheetGridCell {
  date: string;
  entryId: string | null;
  hours: number;
  taskDescription: string;
  isApproved: boolean;
}

export interface TimesheetGridRow {
  projectId: string;
  projectCode: string;
  projectName: string;
  clientName: string | null;
  maxDailyHours: number | null;
  cells: TimesheetGridCell[];
  totalHours: number;
}

/** Rounds to 2 decimal places to keep floating-point hour sums (e.g. 0.1 + 0.2) tidy for display. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumHours(cells: readonly { hours: number }[]): number {
  return round2(cells.reduce((total, cell) => total + cell.hours, 0));
}

/**
 * Joins the active project list with this week's timesheet entries into one
 * row per project, Monday-first, for the `/timesheets` weekly grid. Every
 * active project gets a row (even with no logged hours yet) per the
 * wireframe's "Log your daily hours per project" framing
 * (`docs/HR_System_FE_wireframe.pdf`) - there is no per-user
 * project-assignment lookup endpoint in
 * `docs/HR_System_BE.postman_collection.json`, so the full active project
 * list is used rather than a narrower "my projects" subset.
 */
export function buildTimesheetGrid(
  projects: readonly Project[],
  entries: readonly TimesheetEntry[],
  weekStart: string
): TimesheetGridRow[] {
  const weekDates = getWeekDates(weekStart);

  return projects
    .filter((project) => project.isActive)
    .map((project) => {
      const cells: TimesheetGridCell[] = weekDates.map((date) => {
        const entry = entries.find(
          (candidate) => candidate.projectId === project.id && candidate.entryDate === date
        );
        return {
          date,
          entryId: entry?.id ?? null,
          hours: entry?.hours ?? 0,
          taskDescription: entry?.taskDescription ?? '',
          isApproved: entry?.isApproved ?? false,
        };
      });

      return {
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        clientName: project.clientName,
        maxDailyHours: project.maxDailyHours,
        cells,
        totalHours: sumHours(cells),
      };
    });
}

/** Per-day sums across every row - the grid's "Daily Total" row. */
export function calculateDailyTotals(
  rows: readonly { cells: readonly { hours: number }[] }[],
  weekStart: string
): number[] {
  const weekDates = getWeekDates(weekStart);
  return weekDates.map((_date, index) =>
    round2(rows.reduce((sum, row) => sum + (row.cells[index]?.hours ?? 0), 0))
  );
}
