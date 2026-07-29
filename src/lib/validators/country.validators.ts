import { z } from 'zod';
import { COUNTRY_CODE_REGEX } from '@/lib/constants/country.constants';

/**
 * Zod schemas mirroring the backend's `CreateCountry`/`UpdateCountry`
 * request DTOs (see docs/HR_System_BE.postman_collection.json).
 */

const codeShape = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, 'Country code is required.')
  .regex(COUNTRY_CODE_REGEX, 'Use 2 uppercase letters (ISO 3166-1 alpha-2, e.g. SG).');

const nameShape = z
  .string()
  .trim()
  .min(1, 'Country name is required.')
  .max(100, 'Country name is too long.');

/**
 * The single schema used as `CountryForm`'s `zodResolver` for both create
 * and edit modes (mirrors `CurrencyForm`/`createCurrencySchema`'s "superset"
 * approach): it validates every field `CreateCountry` accepts. In edit mode,
 * `code` is pre-filled from the existing country and not rendered as an
 * editable input (the backend's `UpdateCountry` doesn't accept it - see
 * `updateCountrySchema` below), so validation still passes even though the
 * user can't change it there.
 */
export const createCountrySchema = z.object({
  code: codeShape,
  name: nameShape,
});
export type CreateCountryFormValues = z.infer<typeof createCountrySchema>;

/** The raw, pre-validation shape `react-hook-form` collects from `CountryForm`'s DOM inputs. */
export type CountryFormFieldValues = z.input<typeof createCountrySchema>;

/** Mirrors the backend's `UpdateCountry` request DTO - name only. */
export const updateCountrySchema = z.object({
  name: nameShape,
});
export type UpdateCountryFormValues = z.infer<typeof updateCountrySchema>;
