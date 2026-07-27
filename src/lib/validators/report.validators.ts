import { z } from 'zod';
import { REPORT_EXPORT_FORMATS } from '@/lib/constants/report.constants';

/**
 * Zod schemas for the Report domain, mirroring the query parameters
 * documented for `/Report/Generate*`/`/Report/Export*` in
 * docs/HR_System_BE.postman_collection.json. Unlike the other domains'
 * validators (which validate a JSON request body), these validate the
 * `URLSearchParams` a GET request's Route Handler reads off `request.url` -
 * every value arrives as a string (or is simply absent), so schemas below
 * are written against that raw string shape rather than the JSON body shape
 * used elsewhere.
 */

const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date (YYYY-MM-DD).')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date.');

/** Both start and end dates are required; end must not be before start. */
function refineDateRange<T extends { startDate: string; endDate: string }>(data: T, ctx: z.RefinementCtx) {
  if (Date.parse(data.endDate) < Date.parse(data.startDate)) {
    ctx.addIssue({ code: 'custom', message: 'End date must be on or after the start date.', path: ['endDate'] });
  }
}

const timesheetReportShape = {
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  projectId: z.string().trim().min(1).optional(),
  userId: z.string().trim().min(1).optional(),
  isApproved: z.enum(['true', 'false']).optional(),
};

/** Mirrors `GenerateTimesheetReport`'s query params (`startDate`/`endDate` required, rest optional). */
export const timesheetReportQuerySchema = z.object(timesheetReportShape).superRefine(refineDateRange);
export type TimesheetReportQuery = z.infer<typeof timesheetReportQuerySchema>;

/** Mirrors `ExportTimesheetReport`'s query params - same as above, plus `format`. */
export const timesheetReportExportQuerySchema = z
  .object({ ...timesheetReportShape, format: z.enum(REPORT_EXPORT_FORMATS).default('xlsx') })
  .superRefine(refineDateRange);
export type TimesheetReportExportQuery = z.infer<typeof timesheetReportExportQuerySchema>;

const userRolesSummaryShape = {
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  projectId: z.string().trim().min(1).optional(),
};

/** Mirrors `GenerateUserRolesSummary`'s query params. */
export const userRolesSummaryQuerySchema = z.object(userRolesSummaryShape).superRefine(refineDateRange);
export type UserRolesSummaryQuery = z.infer<typeof userRolesSummaryQuerySchema>;

/** Mirrors `ExportUserRolesSummary`'s query params - same as above, plus `format`. */
export const userRolesSummaryExportQuerySchema = z
  .object({ ...userRolesSummaryShape, format: z.enum(REPORT_EXPORT_FORMATS).default('xlsx') })
  .superRefine(refineDateRange);
export type UserRolesSummaryExportQuery = z.infer<typeof userRolesSummaryExportQuerySchema>;

const currentYear = new Date().getUTCFullYear();

const monthlyCostRevenueShape = {
  year: z.coerce
    .number({ error: 'Year is required.' })
    .int('Year must be a whole number.')
    .min(2000, 'Year is out of range.')
    .max(currentYear + 5, 'Year is out of range.'),
  month: z.coerce
    .number({ error: 'Month is required.' })
    .int('Month must be a whole number.')
    .min(1, 'Month must be between 1 and 12.')
    .max(12, 'Month must be between 1 and 12.'),
  projectId: z.string().trim().min(1).optional(),
  currencyId: z.string().trim().min(1).optional(),
};

/** Mirrors `GenerateMonthlyCostRevenue`'s query params (`year`/`month` required, rest optional). */
export const monthlyCostRevenueQuerySchema = z.object(monthlyCostRevenueShape);
export type MonthlyCostRevenueQuery = z.infer<typeof monthlyCostRevenueQuerySchema>;

/** Mirrors `ExportMonthlyCostRevenue`'s query params - same as above, plus `format`. */
export const monthlyCostRevenueExportQuerySchema = z.object({
  ...monthlyCostRevenueShape,
  format: z.enum(REPORT_EXPORT_FORMATS).default('xlsx'),
});
export type MonthlyCostRevenueExportQuery = z.infer<typeof monthlyCostRevenueExportQuerySchema>;
