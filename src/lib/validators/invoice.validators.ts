import { z } from 'zod';
import { INVOICE_STATUSES } from '@/types/domain.types';

/**
 * Zod schemas mirroring the backend's `GenerateInvoice`/`UpdateInvoice`
 * request DTOs (see docs/HR_System_BE.postman_collection.json), plus a
 * query-param schema for `GET /Invoice/GetAllInvoices`'s optional filters
 * (following `report.validators.ts`'s pattern for validating raw
 * `URLSearchParams` string values).
 */

const isoDateSchema = z
  .string()
  .trim()
  .min(1, 'Date is required.')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date (YYYY-MM-DD).')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date.');

const optionalEmailSchema = z.string().trim().email('Enter a valid email address.').optional().or(z.literal(''));

const notesSchema = z.string().trim().max(2000, 'Notes are too long.').optional().or(z.literal(''));

/**
 * Mirrors `GenerateInvoice`'s request DTO. `ProjectId`/`BillingPeriodStart`/
 * `BillingPeriodEnd`/`CurrencyId` are required per the documented endpoint
 * (only `ClientEmail`/`IssuedDate`/`DueDate`/`Notes` are called out as
 * optional there) - `IssuedDate`/`DueDate` are still required here because
 * the `/invoices/generate` form always collects them upfront rather than
 * leaving the backend to default them.
 */
export const generateInvoiceSchema = z
  .object({
    projectId: z.string().trim().min(1, 'Select a project.'),
    billingPeriodStart: isoDateSchema,
    billingPeriodEnd: isoDateSchema,
    currencyId: z.string().trim().min(1, 'Select a currency.'),
    clientName: z.string().trim().min(1, 'Client name is required.').max(200, 'Client name is too long.'),
    clientEmail: optionalEmailSchema,
    issuedDate: isoDateSchema,
    dueDate: isoDateSchema,
    notes: notesSchema,
  })
  .superRefine((data, ctx) => {
    if (Date.parse(data.billingPeriodEnd) < Date.parse(data.billingPeriodStart)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Billing period end must be on or after the start date.',
        path: ['billingPeriodEnd'],
      });
    }
    if (Date.parse(data.dueDate) < Date.parse(data.issuedDate)) {
      ctx.addIssue({ code: 'custom', message: 'Due date must be on or after the issued date.', path: ['dueDate'] });
    }
  });

export type GenerateInvoiceFormValues = z.infer<typeof generateInvoiceSchema>;

/**
 * Mirrors `UpdateInvoice`'s request DTO ("Update editable fields on a Draft
 * invoice ... All fields are optional" per its documented description). The
 * `/invoices/[id]` edit form always shows the invoice's current values
 * pre-filled, so every field is still required here for a coherent save
 * (an empty client name/date would never be an intentional edit) - the
 * backend's own optionality just means a partial body is *also* accepted,
 * which this form never needs to send.
 */
export const updateInvoiceSchema = z
  .object({
    currencyId: z.string().trim().min(1, 'Select a currency.'),
    clientName: z.string().trim().min(1, 'Client name is required.').max(200, 'Client name is too long.'),
    clientEmail: optionalEmailSchema,
    issuedDate: isoDateSchema,
    dueDate: isoDateSchema,
    notes: notesSchema,
  })
  .superRefine((data, ctx) => {
    if (Date.parse(data.dueDate) < Date.parse(data.issuedDate)) {
      ctx.addIssue({ code: 'custom', message: 'Due date must be on or after the issued date.', path: ['dueDate'] });
    }
  });

export type UpdateInvoiceFormValues = z.infer<typeof updateInvoiceSchema>;

/** Mirrors `GetAllInvoices`'s optional `projectId`/`status` query params. */
export const invoiceListQuerySchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  status: z.enum(INVOICE_STATUSES).optional(),
});
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;
