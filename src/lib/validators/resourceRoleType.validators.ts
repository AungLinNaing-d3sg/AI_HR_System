import { z } from 'zod';

/**
 * Zod schemas mirroring the backend's `CreateResourceRoleType`/
 * `UpdateResourceRoleType` request DTOs (see
 * docs/HR_System_BE.postman_collection.json). Both endpoints accept the
 * exact same shape - `Name` (required, must be unique) and an optional
 * `Description` - so a single schema serves both create and edit modes,
 * mirroring `CurrencyForm`/`createCurrencySchema`'s "one superset schema"
 * approach.
 */

const nameShape = z
  .string()
  .trim()
  .min(1, 'Role name is required.')
  .max(100, 'Role name is too long.');

const descriptionShape = z
  .string()
  .trim()
  .max(500, 'Description is too long.')
  .optional()
  .or(z.literal(''));

export const createResourceRoleTypeSchema = z.object({
  name: nameShape,
  description: descriptionShape,
});
export type CreateResourceRoleTypeFormValues = z.infer<typeof createResourceRoleTypeSchema>;

/** The raw, pre-validation shape `react-hook-form` collects from `ResourceRoleTypeForm`'s DOM inputs. */
export type ResourceRoleTypeFormFieldValues = z.input<typeof createResourceRoleTypeSchema>;

/** `UpdateResourceRoleType` accepts the same fields as `CreateResourceRoleType`. */
export const updateResourceRoleTypeSchema = createResourceRoleTypeSchema;
export type UpdateResourceRoleTypeFormValues = z.infer<typeof updateResourceRoleTypeSchema>;
