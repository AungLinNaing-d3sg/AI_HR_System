import { z } from 'zod';

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
    .min(1, 'Role ID is required.')
    .regex(GUID_REGEX, 'Enter a valid Role ID (GUID), e.g. 11111111-1111-1111-1111-111111111101.'),
});
export type CreateUserFormValues = z.infer<typeof createUserSchema>;
