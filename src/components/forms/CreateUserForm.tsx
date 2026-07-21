'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useCreateUser } from '@/hooks/useCreateUser';
import { useRoles } from '@/hooks/useRoles';
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
 */
export function CreateUserForm() {
  const { createUser, isCreating, isSuccess, error, reset: resetMutation } = useCreateUser();
  const { roles, isLoading: isLoadingRoles, isError: isRolesError, error: rolesError } = useRoles();

  const {
    register,
    handleSubmit,
    reset: resetForm,
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
      await createUser(values);
      resetForm();
    } catch {
      // Surfaced via `error` below.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full max-w-md space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900">Create user</h2>

      {error && <Alert variant="error">{error}</Alert>}
      {isRolesError && <Alert variant="error">{rolesError ?? 'Could not load roles.'}</Alert>}
      {isSuccess && <Alert variant="success">User created successfully.</Alert>}

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

      <div className="grid grid-cols-2 gap-4">
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
      </div>

      <div>
        <Label htmlFor="employeeId">Employee ID (optional)</Label>
        <Input id="employeeId" autoComplete="off" {...register('employeeId')} />
      </div>

      <div>
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

      <Button type="submit" isLoading={isCreating}>
        {isCreating ? 'Creating…' : 'Create user'}
      </Button>
    </form>
  );
}
