import { z } from 'zod';
import { MAX_ENTRY_HOURS, TASK_DESCRIPTION_MAX_LENGTH } from '@/lib/constants/timesheet.constants';

/**
 * Zod schemas for the Timesheet Entry domain, mirroring the backend's
 * `CreateTimesheetEntry`/`UpdateTimesheetEntry` request DTOs (see
 * docs/HR_System_BE.postman_collection.json). Hours/notes schemas are also
 * reused directly by the weekly grid's per-cell client-side validation
 * (`useTimesheetGrid`), so a typo or an out-of-range value is caught before
 * a save request is ever sent.
 */

/**
 * Coerces the raw string an `<input type="number">` reports (including `''`
 * when cleared) into a validated hours value, the same empty-string
 * tolerant pattern `project.validators.ts`'s `optionalMaxDailyHoursSchema`
 * uses. An empty cell means "0 hours logged", not an error.
 */
export const timesheetHoursSchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? 0 : Number(value)),
  z
    .number({ error: 'Hours must be a number.' })
    .min(0, 'Hours cannot be negative.')
    .max(MAX_ENTRY_HOURS, `Hours cannot exceed ${MAX_ENTRY_HOURS} in a single day.`)
);

export const taskDescriptionSchema = z
  .string()
  .trim()
  .max(TASK_DESCRIPTION_MAX_LENGTH, `Task notes cannot exceed ${TASK_DESCRIPTION_MAX_LENGTH} characters.`)
  .optional()
  .or(z.literal(''));

const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date (YYYY-MM-DD).')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date.');

/** Validates a single weekly-grid cell edit (hours + task notes) before it is queued to save. */
export const timesheetCellSchema = z.object({
  hours: timesheetHoursSchema,
  taskDescription: taskDescriptionSchema,
});
export type TimesheetCellFormValues = z.infer<typeof timesheetCellSchema>;

/** Mirrors the backend's `CreateTimesheetEntry` request DTO. */
export const createTimesheetEntrySchema = z.object({
  projectId: z.string().trim().min(1, 'Project is required.'),
  timesheetPeriodId: z.string().trim().min(1, 'Timesheet period is required.'),
  entryDate: isoDateSchema,
  hours: timesheetHoursSchema,
  taskDescription: taskDescriptionSchema,
});
export type CreateTimesheetEntryFormValues = z.infer<typeof createTimesheetEntrySchema>;

/** Mirrors the backend's `UpdateTimesheetEntry` request DTO (only Hours/TaskDescription are updatable). */
export const updateTimesheetEntrySchema = z.object({
  hours: timesheetHoursSchema,
  taskDescription: taskDescriptionSchema,
});
export type UpdateTimesheetEntryFormValues = z.infer<typeof updateTimesheetEntrySchema>;

/** Mirrors the backend's `CreateTimesheetPeriod` request DTO. */
export const createTimesheetPeriodSchema = z
  .object({
    periodStart: isoDateSchema,
    periodEnd: isoDateSchema,
  })
  .refine((data) => data.periodEnd >= data.periodStart, {
    message: 'End date must be on or after the start date.',
    path: ['periodEnd'],
  });
export type CreateTimesheetPeriodFormValues = z.infer<typeof createTimesheetPeriodSchema>;
