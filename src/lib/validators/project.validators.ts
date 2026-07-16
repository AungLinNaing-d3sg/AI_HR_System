import { z } from 'zod';
import { MAX_DAILY_HOURS_LIMIT, PROJECT_CODE_REGEX } from '@/lib/constants/project.constants';

/**
 * Zod schemas mirroring the backend's `CreateProject`/`UpdateProject`
 * request DTOs (see docs/HR_System_BE.postman_collection.json). Optional
 * backend fields are modeled as an empty-string-tolerant optional so plain
 * HTML form inputs (which report `''`, not `undefined`, when left blank)
 * validate cleanly.
 */

const optionalDateSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .refine((value) => !value || !Number.isNaN(Date.parse(value)), 'Enter a valid date.');

const optionalMaxDailyHoursSchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
  z
    .number({ error: 'Max daily hours must be a number.' })
    .positive('Max daily hours must be greater than 0.')
    .max(MAX_DAILY_HOURS_LIMIT, `Max daily hours cannot exceed ${MAX_DAILY_HOURS_LIMIT}.`)
    .optional()
);

const projectBaseShape = {
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Project code is required.')
    .max(20, 'Project code is too long.')
    .regex(PROJECT_CODE_REGEX, 'Use letters, numbers, and hyphens only (e.g. PRJ-001).'),
  name: z.string().trim().min(1, 'Project name is required.').max(200, 'Project name is too long.'),
  description: z.string().trim().max(2000, 'Description is too long.').optional().or(z.literal('')),
  clientName: z.string().trim().max(200, 'Client name is too long.').optional().or(z.literal('')),
  clientEmail: z
    .string()
    .trim()
    .email('Enter a valid email address.')
    .optional()
    .or(z.literal('')),
  startDate: optionalDateSchema,
  endDate: optionalDateSchema,
  maxDailyHours: optionalMaxDailyHoursSchema,
};

/** Both start and end dates are optional, but if present, end must not be before start. */
function refineDateRange<T extends { startDate?: string; endDate?: string }>(
  data: T,
  ctx: z.RefinementCtx
) {
  if (data.startDate && data.endDate && Date.parse(data.endDate) < Date.parse(data.startDate)) {
    ctx.addIssue({
      code: 'custom',
      message: 'End date cannot be before the start date.',
      path: ['endDate'],
    });
  }
}

export const createProjectSchema = z.object(projectBaseShape).superRefine(refineDateRange);
export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({ ...projectBaseShape, isActive: z.boolean() })
  .superRefine(refineDateRange);
export type UpdateProjectFormValues = z.infer<typeof updateProjectSchema>;

/**
 * The raw, pre-validation shape `react-hook-form` actually collects from the
 * DOM (e.g. `maxDailyHours` as the string an `<input type="number">`
 * reports, before `optionalMaxDailyHoursSchema`'s `z.preprocess` coerces it
 * to a number). Used as `useForm`'s field-values generic so its type lines
 * up with what `zodResolver` expects to receive, while `handleSubmit`'s
 * callback still receives the validated/transformed `UpdateProjectFormValues`.
 */
export type ProjectFormFieldValues = z.input<typeof updateProjectSchema>;
