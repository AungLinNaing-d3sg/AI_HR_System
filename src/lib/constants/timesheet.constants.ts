/**
 * Timesheet-related constants shared between Route Handlers, validators, and
 * the weekly grid UI (`components/tables/TimesheetGrid.tsx`).
 */

/**
 * Sane upper bound for a single day's logged hours when a project does not
 * define its own `maxDailyHours` (mirrors `MAX_DAILY_HOURS_LIMIT` in
 * `project.constants.ts`).
 */
export const MAX_ENTRY_HOURS = 24;

/** Smallest increment the hour input accepts (quarter-hour granularity). */
export const HOURS_STEP = 0.25;

export const TASK_DESCRIPTION_MAX_LENGTH = 500;

/**
 * The wireframe's `/timesheets` screen (`docs/HR_System_FE_wireframe.pdf`)
 * flags a day whose total crosses this as an over-allocation warning, not a
 * hard validation error.
 */
export const DAILY_HOURS_WARNING_THRESHOLD = 8;
