import { z } from 'zod';
import { EXCHANGE_RATE_DATE_REGEX, MIN_EXCHANGE_RATE } from '@/lib/constants/exchangeRate.constants';

/**
 * Zod schemas mirroring the backend's `CreateExchangeRate`/`UpdateExchangeRate`
 * request DTOs (see docs/HR_System_BE.postman_collection.json).
 */

/**
 * `<input type="number">` reports a string (including `''` when cleared),
 * so `z.coerce.number()` normalizes that raw value before the numeric checks
 * run - the same tolerant pattern `currency.validators.ts`'s string shapes
 * use for `.trim()`, just for a number field instead. An empty/non-numeric
 * value coerces to `NaN`/`0`, both of which fail `.positive()` below, so it
 * doubles as this field's "required" validation too.
 */
const rateShape = z.coerce
  .number({ error: 'Rate must be a valid number.' })
  .positive('Rate must be greater than 0.')
  .min(MIN_EXCHANGE_RATE, 'Rate must be greater than 0.');

const effectiveDateShape = z
  .string()
  .trim()
  .min(1, 'Effective date is required.')
  .regex(EXCHANGE_RATE_DATE_REGEX, 'Enter a valid date (YYYY-MM-DD).')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date.');

/**
 * The single schema used as `ExchangeRateForm`'s `zodResolver` for both
 * create and edit modes (mirrors `CurrencyForm`/`createCurrencySchema`'s
 * "superset" approach): it validates every field `CreateExchangeRate`
 * accepts. `fromCurrencyId` is deliberately absent here - every rate added
 * through this form is always FROM the app's current base currency (see
 * `docs/HR_System_FE_wireframe.pdf`'s `/admin/exchange-rates` - "Define
 * conversion rates from the base currency (SGD) to other currencies"); the
 * base currency's id is resolved server-side in the Route Handler from the
 * Currency domain (never trusted from the client) rather than exposed as an
 * editable field here - see `app/api/exchange-rates/route.ts`.
 *
 * In edit mode, `toCurrencyId` is pre-filled from the existing rate and not
 * rendered as an editable input (the backend's `UpdateExchangeRate` doesn't
 * accept it - see `updateExchangeRateSchema` below - a currency pair is
 * fixed at creation time), so validation still passes even though the user
 * can't change it there.
 */
export const createExchangeRateSchema = z.object({
  toCurrencyId: z.string().trim().min(1, 'Target currency is required.'),
  rate: rateShape,
  effectiveDate: effectiveDateShape,
  isActive: z.boolean(),
});
export type CreateExchangeRateFormValues = z.infer<typeof createExchangeRateSchema>;

/**
 * The raw, pre-validation shape `react-hook-form` collects from
 * `ExchangeRateForm`'s DOM inputs - mirrors `CurrencyFormFieldValues`'s
 * `z.input`-derived pattern. `rate`'s `z.coerce.number()` makes its own input
 * type `unknown` (coercion accepts any raw value before parsing it as a
 * number), which `zodResolver`'s type requires `useForm`'s generic to match
 * exactly; the actual runtime value is always what a text/number `<input>`
 * reports (a string) or, in edit mode, the already-numeric value read back
 * from the loaded `ExchangeRate`.
 */
export type ExchangeRateFormFieldValues = z.input<typeof createExchangeRateSchema>;

/**
 * Mirrors the backend's `UpdateExchangeRate` request DTO - rate, effective
 * date, and active status only (the currency pair itself is fixed at
 * creation time).
 */
export const updateExchangeRateSchema = z.object({
  rate: rateShape,
  effectiveDate: effectiveDateShape,
  isActive: z.boolean(),
});
export type UpdateExchangeRateFormValues = z.infer<typeof updateExchangeRateSchema>;
