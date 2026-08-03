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

/**
 * Shared "must pick a country" rule for `createUserSchema`,
 * `updateUserFormSchema`, and `updateProfileFormSchema` - the Country field
 * is required on the Create User, Edit User, and My Account/Profile forms
 * (business requirement), unlike the backend contract itself (`CountryId`
 * is nullable there, see the "Create User"/"Update User" examples in
 * docs/HR_System_BE.postman_collection.json).
 */
const REQUIRED_COUNTRY_ID_SCHEMA = z
  .string()
  .trim()
  .min(1, 'Please select a country.')
  .regex(GUID_REGEX, 'Select a valid country.');

export const loginSchema = z.object({
  usernameOrEmail: z.string().trim().min(1, 'Username or email is required.'),
  password: z.string().min(1, 'Password is required.'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(100, 'First name is too long.'),
  lastName: z.string().trim().min(1, 'Last name is required.').max(100, 'Last name is too long.'),
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  // Wire-level contract validated by `PUT /api/auth/profile` - stays
  // optional/nullable (unlike `updateProfileFormSchema` below) so a legacy
  // account with no country on record can still update its other profile
  // fields without being forced to pick one first.
  countryId: z.string().trim().optional().nullable(),
});
export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;

/**
 * Form-only variant of `updateProfileSchema`, requiring `countryId` to be a
 * selected, valid GUID - mirrors `createUserSchema`/`updateUserFormSchema`'s
 * "Country is required" business rule, now that `UpdateProfileForm` surfaces
 * a searchable Country field (`CountrySearchCombobox`, backed by
 * `GET /Country/GetAllCountries`) instead of carrying `countryId` through as
 * a hidden field. Used exclusively by `UpdateProfileForm`'s `zodResolver` -
 * `PUT /api/auth/profile` itself keeps validating against the more
 * permissive `updateProfileSchema` above.
 */
export const updateProfileFormSchema = updateProfileSchema.extend({
  countryId: REQUIRED_COUNTRY_ID_SCHEMA,
});
export type UpdateProfileFormSchemaValues = z.infer<typeof updateProfileFormSchema>;

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

/**
 * Backs the `SystemAdmin`-only Create User form (`CreateUserForm`, `POST
 * /Auth/CreateUser`). `countryId` is required (business requirement) even
 * though the backend itself accepts a `null` `CountryId` (see
 * `REQUIRED_COUNTRY_ID_SCHEMA`) - every account created through this form
 * must have a country on record.
 */
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
  countryId: REQUIRED_COUNTRY_ID_SCHEMA,
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
 *
 * `countryId` stays optional here (the wire-level contract validated by
 * `PUT /api/auth/users/:id`, see that Route Handler) so the Activate/
 * Deactivate quick action keeps working for a legacy row that has no
 * country on record - it resubmits the row's existing values without ever
 * opening a form. The Edit User form itself requires a country; see
 * `updateUserFormSchema` below, used only by `UserEditForm`'s
 * `zodResolver`.
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
 * Form-only variant of `updateUserSchema`, requiring `countryId` to be a
 * selected, valid GUID (business requirement: Country is required on the
 * Edit User form). Used exclusively by `UserEditForm`'s `zodResolver` -
 * `PUT /api/auth/users/:id` itself keeps validating against the more
 * permissive `updateUserSchema` above, so this stricter, form-only rule
 * never blocks `UsersTable`'s row-level Activate/Deactivate quick action.
 */
export const updateUserFormSchema = updateUserSchema.extend({
  countryId: REQUIRED_COUNTRY_ID_SCHEMA,
});
export type UpdateUserFormSchemaValues = z.infer<typeof updateUserFormSchema>;

/**
 * Validates the `URLSearchParams` `GET /api/auth/search-users` reads off
 * `request.url` (see `lib/utils/searchParams.ts`'s `pickSearchParams`) before
 * forwarding to `GET /Auth/SearchUsers?email=&userName=`. Both params are
 * fully optional - the backend supports calling `SearchUsers` with neither
 * one to return its broad/unfiltered candidate list, which is what the "Add
 * User to Project" combobox's initial, pre-search view now relies on (see
 * `useUserSearch`, replacing the removed `GetUserList`-backed `useUserList`
 * dropdown). When a param *is* supplied, though, it must still meet
 * `MIN_USER_SEARCH_QUERY_LENGTH` - the client always sends the same
 * as-you-type text as both (see `auth.api.ts#searchUsers`), so this guards
 * against an overly narrow 1-character search reaching the backend, without
 * blocking the no-params case.
 */
const optionalSearchTermSchema = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, 'Search term is too long.')
    .refine((value) => value.length === 0 || value.length >= MIN_USER_SEARCH_QUERY_LENGTH, {
      message: `Enter at least ${MIN_USER_SEARCH_QUERY_LENGTH} characters to search.`,
    })
    .optional();

export const searchUsersQuerySchema = z.object({
  email: optionalSearchTermSchema(200),
  userName: optionalSearchTermSchema(100),
});
export type SearchUsersQueryValues = z.infer<typeof searchUsersQuerySchema>;
