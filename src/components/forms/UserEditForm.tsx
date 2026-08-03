'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useRoles } from '@/hooks/useRoles';
import { useUpdateUser } from '@/hooks/useUpdateUser';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { CountrySearchCombobox } from '@/components/common/CountrySearchCombobox';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { updateUserFormSchema, type UpdateUserFormSchemaValues } from '@/lib/validators/auth.validators';
import type { AdminUserListItem } from '@/types/domain.types';

export interface UserEditFormProps {
  user: AdminUserListItem;
  /** Called after a successful update so the parent modal can close itself. */
  onSuccess: () => void;
  /** Called when the user cancels out of the form without saving. */
  onCancel: () => void;
}

function toFormValues(user: AdminUserListItem): UpdateUserFormSchemaValues {
  return {
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    employeeId: user.employeeId ?? '',
    countryId: user.countryId ?? '',
    isActive: user.isActive,
    // Always starts unset ("Keep current role") rather than trying to
    // reverse-map `user.roleName` back to a `RoleId`: the row only carries
    // the role's display name (see `AdminUserListItem`), and resolving that
    // to a GUID depends on `useRoles` having already loaded, which isn't
    // guaranteed by the time this form mounts. Leaving it blank submits
    // `RoleId: null`, which the backend documents as "no change" - the
    // admin only needs to pick a role here to actively change it.
    roleId: '',
  };
}

/**
 * Row-level "Edit" form for the `SystemAdmin`-only `/admin/users` management
 * table (see `UsersTable`/`UserEditFormModal`), backed by `PUT
 * /Auth/UpdateUser/{id}`. Unlike `CreateUserForm`, there is no password
 * field (password changes go through the dedicated Change Password flow)
 * and `roleId` is optional: left on "Keep current role", the account's
 * existing role is preserved (the backend accepts `RoleId: null` to mean
 * "no change" - see `updateUserSchema`'s comment). The Country field mirrors
 * `CreateUserForm`'s searchable `CountrySearchCombobox` (same
 * `GET /Country/GetAllCountries`-backed, search-as-you-type UX), pre-filled
 * with the user's current country label once the reference list loads (see
 * `CountrySearchCombobox`'s doc comment), and - like `CreateUserForm` - is
 * required to save this form (see `updateUserFormSchema`, the stricter,
 * form-only variant of `updateUserSchema` used by this form's
 * `zodResolver`). The Status dropdown mirrors
 * `CurrencyForm`'s edit-mode Active/Inactive `Select` pattern -
 * this is also how a row is "deleted": there is no delete/deactivate
 * endpoint for a user account, so setting Status to Inactive here is the
 * closest equivalent (see `UsersTable`'s row-level Activate/Deactivate
 * action, which submits this same shape without opening this form, and
 * still allows an empty `countryId` for a legacy row with no country on
 * record - see `updateUserFormSchema`'s doc comment for why).
 */
export function UserEditForm({ user, onSuccess, onCancel }: UserEditFormProps) {
  const { updateUser, isUpdating, error, reset: resetMutation } = useUpdateUser();
  const { roles, isLoading: isLoadingRoles, isError: isRolesError, error: rolesError } = useRoles();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UpdateUserFormSchemaValues>({
    resolver: zodResolver(updateUserFormSchema),
    defaultValues: toFormValues(user),
  });

  const onSubmit = async (values: UpdateUserFormSchemaValues) => {
    resetMutation();
    try {
      await updateUser({ id: user.userId, values });
      onSuccess();
    } catch {
      // Surfaced via `error` below.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      {isRolesError && <Alert variant="error">{rolesError ?? 'Could not load roles.'}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="edit-username">Username</Label>
          <Input
            id="edit-username"
            autoComplete="off"
            hasError={Boolean(errors.username)}
            aria-describedby={errors.username ? 'edit-username-error' : undefined}
            {...register('username')}
          />
          <FieldError id="edit-username-error" message={errors.username?.message} />
        </div>

        <div>
          <Label htmlFor="edit-email">Email</Label>
          <Input
            id="edit-email"
            type="email"
            autoComplete="off"
            hasError={Boolean(errors.email)}
            aria-describedby={errors.email ? 'edit-email-error' : undefined}
            {...register('email')}
          />
          <FieldError id="edit-email-error" message={errors.email?.message} />
        </div>

        <div>
          <Label htmlFor="edit-firstName">First name</Label>
          <Input
            id="edit-firstName"
            autoComplete="off"
            hasError={Boolean(errors.firstName)}
            aria-describedby={errors.firstName ? 'edit-firstName-error' : undefined}
            {...register('firstName')}
          />
          <FieldError id="edit-firstName-error" message={errors.firstName?.message} />
        </div>

        <div>
          <Label htmlFor="edit-lastName">Last name</Label>
          <Input
            id="edit-lastName"
            autoComplete="off"
            hasError={Boolean(errors.lastName)}
            aria-describedby={errors.lastName ? 'edit-lastName-error' : undefined}
            {...register('lastName')}
          />
          <FieldError id="edit-lastName-error" message={errors.lastName?.message} />
        </div>

        <div>
          <Label htmlFor="edit-employeeId">Employee ID (optional)</Label>
          <Input id="edit-employeeId" autoComplete="off" {...register('employeeId')} />
        </div>

        <div>
          <Label htmlFor="edit-countryId">Country</Label>
          <Controller
            name="countryId"
            control={control}
            render={({ field }) => (
              <CountrySearchCombobox
                id="edit-countryId"
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                hasError={Boolean(errors.countryId)}
                aria-describedby={errors.countryId ? 'edit-countryId-error' : undefined}
              />
            )}
          />
          <FieldError id="edit-countryId-error" message={errors.countryId?.message} />
        </div>

        <div>
          <Label htmlFor="edit-roleId">Role</Label>
          <Select
            id="edit-roleId"
            hasError={Boolean(errors.roleId)}
            aria-describedby={errors.roleId ? 'edit-roleId-error' : 'edit-roleId-help'}
            disabled={isLoadingRoles}
            {...register('roleId')}
          >
            <option value="">{isLoadingRoles ? 'Loading roles…' : 'Keep current role'}</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
          <p id="edit-roleId-help" className="mt-1 text-xs text-zinc-500">
            Current role: {user.roleName ?? 'unavailable'}. Only pick a role above to change it.
          </p>
          <FieldError id="edit-roleId-error" message={errors.roleId?.message} />
        </div>

        <div>
          <Label htmlFor="edit-isActive">Status</Label>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Select
                id="edit-isActive"
                name={field.name}
                onBlur={field.onBlur}
                ref={field.ref}
                value={field.value ? 'true' : 'false'}
                onChange={(event) => field.onChange(event.target.value === 'true')}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isUpdating}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isUpdating}>
          {isUpdating ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
