import { z } from 'zod';
import { CURRENCY_CODE_REGEX } from '@/lib/constants/currency.constants';

/**
 * Zod schemas mirroring the backend's `CreateCurrency`/`UpdateCurrency`
 * request DTOs (see docs/HR_System_BE.postman_collection.json).
 */

const codeShape = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, 'Currency code is required.')
  .regex(CURRENCY_CODE_REGEX, 'Use 3 uppercase letters (ISO 4217, e.g. USD).');

const nameShape = z
  .string()
  .trim()
  .min(1, 'Currency name is required.')
  .max(100, 'Currency name is too long.');

const symbolShape = z
  .string()
  .trim()
  .min(1, 'Currency symbol is required.')
  .max(10, 'Currency symbol is too long.');

/**
 * The single schema used as `CurrencyForm`'s `zodResolver` for both create
 * and edit modes (mirrors `ProjectForm`/`updateProjectSchema`'s "superset"
 * approach): it validates every field `CreateCurrency` accepts. In edit
 * mode, `code`/`isBaseCurrency` are pre-filled from the existing currency
 * and not rendered as editable inputs (the backend's `UpdateCurrency`
 * doesn't accept them - see `updateCurrencySchema` below), so validation
 * still passes even though the user can't change them there.
 */
export const createCurrencySchema = z.object({
  code: codeShape,
  name: nameShape,
  symbol: symbolShape,
  isBaseCurrency: z.boolean(),
  isActive: z.boolean(),
});
export type CreateCurrencyFormValues = z.infer<typeof createCurrencySchema>;

/** The raw, pre-validation shape `react-hook-form` collects from `CurrencyForm`'s DOM inputs. */
export type CurrencyFormFieldValues = z.input<typeof createCurrencySchema>;

/** Mirrors the backend's `UpdateCurrency` request DTO - name, symbol, and active status only. */
export const updateCurrencySchema = z.object({
  name: nameShape,
  symbol: symbolShape,
  isActive: z.boolean(),
});
export type UpdateCurrencyFormValues = z.infer<typeof updateCurrencySchema>;
