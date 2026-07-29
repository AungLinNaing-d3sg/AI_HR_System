import { z } from 'zod';
import { MIN_USER_SEARCH_QUERY_LENGTH } from '@/lib/constants/user.constants';

/**
 * Requires at least one lowercase letter, one uppercase letter, one digit,
 * and one special character. Mirrors typical backend password policy
 * (see Postman examples: "Password@123").
 */
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

/**
 * The backend deserializes `RoleId`/`CountryId` as `System.Guid` (a
 * non-nullable value type) - a malformed or empty value never reaches
 * business logic at all, it fails JSON model binding first and returns a
 * raw, unwrapped framework error ("The JSON value could not be converted to
 * System.Guid. Path: $.RoleId ...") instead of a friendly validation
 * message. Validating the format here means the user sees a clear inline
 * error instead of that raw backend crash.
 */
const GUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const loginSchema = z.object({
  usernameOrEmail: z.string().trim().min(1, 'Username or email is required.'),
  password: z.string().min(1, 'Password is required.'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(100, 'First name is too long.'),
  lastName: z.string().trim().min(1, 'Last name is required.').max(100, 'Last name is too long.'),
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  // Not surfaced as an editable field in this feature (no country lookup
  // endpoint is in scope); carried through as a hidden field so an existing
  // value is preserved rather than being wiped by the update.
  countryId: z.string().trim().optional().nullable(),
});
export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters.')
      .regex(
        PASSWORD_COMPLEXITY_REGEX,
        'Password must include an uppercase letter, lowercase letter, number, and special character.'
      ),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match.',
    path: ['confirmNewPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from the current password.',
    path: ['newPassword'],
  });
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

/**
 * Backs the `SystemAdmin`-only `/admin/users` management table's row-level
 * "Reset Password" action (`PUT /Auth/ResetPassword/{id}`, see
 * `ResetPasswordForm`). Unlike `changePasswordSchema`, there is no
 * `currentPassword` field - the admin doesn't know (and shouldn't need) the
 * target account's existing password - and there is no "must differ from
 * current password" refinement for the same reason.
 */
export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters.')
      .regex(
        PASSWORD_COMPLEXITY_REGEX,
        'Password must include an uppercase letter, lowercase letter, number, and special character.'
      ),
    confirmNewPassword: z.string().min(1, 'Please confirm the new password.'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match.',
    path: ['confirmNewPassword'],
  });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const createUserSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters.').max(50, 'Username is too long.'),
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(
      PASSWORD_COMPLEXITY_REGEX,
      'Password must include an uppercase letter, lowercase letter, number, and special character.'
    ),
  firstName: z.string().trim().min(1, 'First name is required.').max(100, 'First name is too long.'),
  lastName: z.string().trim().min(1, 'Last name is required.').max(100, 'Last name is too long.'),
  employeeId: z.string().trim().max(50, 'Employee ID is too long.').optional().or(z.literal('')),
  countryId: z
    .string()
    .trim()
    .regex(GUID_REGEX, 'Enter a valid Country ID (GUID).')
    .optional()
    .or(z.literal('')),
  roleId: z
    .string()
    .trim()
    .min(1, 'Please select a role.')
    .regex(GUID_REGEX, 'Select a valid role.'),
});
export type CreateUserFormValues = z.infer<typeof createUserSchema>;

/**
 * Mirrors the backend's `UpdateUser` request DTO (`PUT
 * /Auth/UpdateUser/{id}`, see docs/HR_System_BE.postman_collection.json).
 * Unlike `createUserSchema`, there is no `password` field (password changes
 * go through the dedicated Change Password flow) and `roleId` is optional -
 * left blank, the account's current role is preserved (the backend accepts
 * `RoleId: null` to mean "no change", per the documented example request).
 * `isActive` backs both the edit form's Status dropdown and the
 * `/admin/users` table's row-level Activate/Deactivate action, which
 * resubmits this same schema's shape with every other field unchanged and
 * only `isActive` flipped.
 */
export const updateUserSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters.').max(50, 'Username is too long.'),
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  firstName: z.string().trim().min(1, 'First name is required.').max(100, 'First name is too long.'),
  lastName: z.string().trim().min(1, 'Last name is required.').max(100, 'Last name is too long.'),
  employeeId: z.string().trim().max(50, 'Employee ID is too long.').optional().or(z.literal('')),
  countryId: z
    .string()
    .trim()
    .regex(GUID_REGEX, 'Enter a valid Country ID (GUID).')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean(),
  roleId: z
    .string()
    .trim()
    .regex(GUID_REGEX, 'Select a valid role.')
    .optional()
    .or(z.literal('')),
});
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;

/**
 * Validates the `URLSearchParams` `GET /api/auth/search-users` reads off
 * `request.url` (see `lib/utils/searchParams.ts`'s `pickSearchParams`) before
 * forwarding to `GET /Auth/SearchUsers?email=&userName=`. Both params are
 * optional individually, but at least one must be present and long enough to
 * avoid an overly broad (or empty) backend query - the client always sends
 * the same as-you-type text as both (see `auth.api.ts#searchUsers`), so in
 * practice this only ever rejects a query shorter than
 * `MIN_USER_SEARCH_QUERY_LENGTH`.
 */
export const searchUsersQuerySchema = z
  .object({
    email: z.string().trim().max(200, 'Search term is too long.').optional(),
    userName: z.string().trim().max(100, 'Search term is too long.').optional(),
  })
  .refine(
    (data) =>
      (data.email?.length ?? 0) >= MIN_USER_SEARCH_QUERY_LENGTH ||
      (data.userName?.length ?? 0) >= MIN_USER_SEARCH_QUERY_LENGTH,
    {
      message: `Enter at least ${MIN_USER_SEARCH_QUERY_LENGTH} characters to search.`,
      path: ['userName'],
    }
  );
export type SearchUsersQueryValues = z.infer<typeof searchUsersQuerySchema>;
