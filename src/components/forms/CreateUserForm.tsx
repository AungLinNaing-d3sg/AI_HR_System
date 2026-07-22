'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useCreateUser } from '@/hooks/useCreateUser';
import { useRoles } from '@/hooks/useRoles';
import { useKnownUserRolesStore } from '@/stores/knownUserRoles.store';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { createUserSchema, type CreateUserFormValues } from '@/lib/validators/auth.validators';

/**
 * `SystemAdmin`-only account creation form. `RoleId` is selected from a
 * dropdown populated by `useRoles` (`GET /Auth/GetRoles` via
 * `app/api/auth/roles/route.ts`), replacing manual GUID entry.
 *
 * On success, redirects to `/admin/users` (matching the Save-and-redirect
 * pattern already used by `ProjectForm`) rather than staying on this page,
 * so the newly created account is immediately visible in the management
 * table. `GET /Auth/GetUserList` doesn't echo back the role a new account
 * was just given (see docs/HR_System_BE.postman_collection.json), so the
 * exact `RoleId` this admin just chose is resolved to a role name here and
 * recorded in `knownUserRoles.store` - the one place that information is
 * available at all - so `UsersTable` can show a real, non-fabricated role
 * badge for it.
 */
export function CreateUserForm() {
  const router = useRouter();
  const { createUser, isCreating, error, reset: resetMutation } = useCreateUser();
  const { roles, isLoading: isLoadingRoles, isError: isRolesError, error: rolesError } = useRoles();
  const recordUserRole = useKnownUserRolesStore((state) => state.recordUserRole);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      employeeId: '',
      countryId: '',
      roleId: '',
    },
  });

  const onSubmit = async (values: CreateUserFormValues) => {
    resetMutation();
    try {
      const createdUser = await createUser(values);
      const selectedRole = roles.find((role) => role.id === values.roleId);
      if (selectedRole) {
        recordUserRole(createdUser.id, selectedRole.name);
      }
      router.push('/admin/users');
    } catch {
      // Surfaced via `error` below.
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
    >
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {isRolesError && (
        <div className="mb-4">
          <Alert variant="error">{rolesError ?? 'Could not load roles.'}</Alert>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            autoComplete="off"
            hasError={Boolean(errors.username)}
            aria-describedby={errors.username ? 'username-error' : undefined}
            {...register('username')}
          />
          <FieldError id="username-error" message={errors.username?.message} />
        </div>

        <div>
          <Label htmlFor="new-user-email">Email</Label>
          <Input
            id="new-user-email"
            type="email"
            autoComplete="off"
            hasError={Boolean(errors.email)}
            aria-describedby={errors.email ? 'new-user-email-error' : undefined}
            {...register('email')}
          />
          <FieldError id="new-user-email-error" message={errors.email?.message} />
        </div>

        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            autoComplete="off"
            hasError={Boolean(errors.firstName)}
            aria-describedby={errors.firstName ? 'firstName-error' : undefined}
            {...register('firstName')}
          />
          <FieldError id="firstName-error" message={errors.firstName?.message} />
        </div>

        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            autoComplete="off"
            hasError={Boolean(errors.lastName)}
            aria-describedby={errors.lastName ? 'lastName-error' : undefined}
            {...register('lastName')}
          />
          <FieldError id="lastName-error" message={errors.lastName?.message} />
        </div>

        <div>
          <Label htmlFor="new-user-password">Temporary password</Label>
          <Input
            id="new-user-password"
            type="password"
            autoComplete="new-password"
            hasError={Boolean(errors.password)}
            aria-describedby={errors.password ? 'new-user-password-error' : undefined}
            {...register('password')}
          />
          <FieldError id="new-user-password-error" message={errors.password?.message} />
        </div>

        <div>
          <Label htmlFor="employeeId">Employee ID (optional)</Label>
          <Input id="employeeId" autoComplete="off" {...register('employeeId')} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="roleId">Role</Label>
          <Select
            id="roleId"
            hasError={Boolean(errors.roleId)}
            aria-describedby={errors.roleId ? 'roleId-error' : undefined}
            disabled={isLoadingRoles}
            {...register('roleId')}
          >
            <option value="">{isLoadingRoles ? 'Loading roles…' : 'Select a role'}</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
          <FieldError id="roleId-error" message={errors.roleId?.message} />
          {roles.length === 0 && !isLoadingRoles && !isRolesError && (
            <p className="mt-1 text-xs text-zinc-500">No roles available. Contact a system administrator.</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-200 pt-4">
        <Button type="button" variant="outline" onClick={() => router.push('/admin/users')}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isCreating}>
          {isCreating ? 'Creating…' : 'Create user'}
        </Button>
      </div>
    </form>
  );
}
