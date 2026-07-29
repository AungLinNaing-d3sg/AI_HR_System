import { z } from 'zod';
import { MIN_BILLING_RATE, MIN_HOURLY_RATE, RATE_CARD_DATE_REGEX } from '@/lib/constants/rateCard.constants';

/**
 * Zod schemas mirroring the backend's `CreateRateCard`/`UpdateRateCard`
 * request DTOs (see docs/HR_System_BE.postman_collection.json).
 */

/**
 * `<input type="number">` reports a string (including `''` when cleared), so
 * `z.coerce.number()` normalizes that raw value before the numeric checks
 * run - the same tolerant pattern `exchangeRate.validators.ts`'s `rateShape`
 * uses. An empty/non-numeric value coerces to `NaN`/`0`, both of which fail
 * `.positive()` below, so it doubles as this field's "required" validation.
 */
const hourlyRateShape = z.coerce
  .number({ error: 'Hourly rate must be a valid number.' })
  .positive('Hourly rate must be greater than 0.')
  .min(MIN_HOURLY_RATE, 'Hourly rate must be greater than 0.');

/** Unlike `hourlyRateShape`, a billing rate of exactly 0 is valid (see `MIN_BILLING_RATE`'s comment). */
const billingRateShape = z.coerce
  .number({ error: 'Billing rate must be a valid number.' })
  .min(MIN_BILLING_RATE, 'Billing rate cannot be negative.');

const effectiveDateShape = z
  .string()
  .trim()
  .min(1, 'Effective date is required.')
  .regex(RATE_CARD_DATE_REGEX, 'Enter a valid date (YYYY-MM-DD).')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date.');

/**
 * The single schema used as `RateCardForm`'s `zodResolver` for both create
 * and edit modes (mirrors `CurrencyForm`/`ExchangeRateForm`'s "superset"
 * approach): it validates every field `CreateRateCard` accepts. In edit
 * mode, `countryId`/`resourceRoleTypeId`/`currencyId` are pre-filled from the
 * existing rate card and not rendered as editable inputs (the backend's
 * `UpdateRateCard` doesn't accept them - see `updateRateCardSchema` below,
 * a rate card's country/role/currency are fixed at creation time), so
 * validation still passes even though the user can't change them there.
 */
export const createRateCardSchema = z.object({
  countryId: z.string().trim().min(1, 'Country is required.'),
  resourceRoleTypeId: z.string().trim().min(1, 'Role is required.'),
  currencyId: z.string().trim().min(1, 'Currency is required.'),
  hourlyRate: hourlyRateShape,
  billingRate: billingRateShape,
  effectiveDate: effectiveDateShape,
  isActive: z.boolean(),
});
export type CreateRateCardFormValues = z.infer<typeof createRateCardSchema>;

/**
 * The raw, pre-validation shape `react-hook-form` collects from
 * `RateCardForm`'s DOM inputs - mirrors `ExchangeRateFormFieldValues`'s
 * `z.input`-derived pattern.
 */
export type RateCardFormFieldValues = z.input<typeof createRateCardSchema>;

/**
 * Mirrors the backend's `UpdateRateCard` request DTO - rates, effective
 * date, and active status only (the country/role/currency are fixed at
 * creation time).
 */
export const updateRateCardSchema = z.object({
  hourlyRate: hourlyRateShape,
  billingRate: billingRateShape,
  effectiveDate: effectiveDateShape,
  isActive: z.boolean(),
});
export type UpdateRateCardFormValues = z.infer<typeof updateRateCardSchema>;
