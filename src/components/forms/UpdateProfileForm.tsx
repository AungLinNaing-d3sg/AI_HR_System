'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { CountrySearchCombobox } from '@/components/common/CountrySearchCombobox';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  updateProfileFormSchema,
  type UpdateProfileFormSchemaValues,
} from '@/lib/validators/auth.validators';
import type { AuthenticatedUser } from '@/types/domain.types';

/**
 * "Profile details" form on `/profile` (`ProfilePage`), backed by
 * `PUT /Auth/UpdateProfile` (see `useUpdateProfile`). The Country field
 * mirrors `CreateUserForm`/`UserEditForm`'s searchable `CountrySearchCombobox`
 * (same `GET /Country/GetAllCountries`-backed, search-as-you-type UX),
 * pre-filled with the signed-in user's current country once the reference
 * list loads (see that component's doc comment), and - like those forms -
 * is required to save here (see `updateProfileFormSchema`, the stricter,
 * form-only variant of `updateProfileSchema` used by this form's
 * `zodResolver`; the wire-level contract validated by `PUT /api/auth/profile`
 * itself stays permissive so a legacy account with no country on record
 * doesn't get locked out of this page).
 */
export function UpdateProfileForm({ user }: { user: AuthenticatedUser }) {
  const { updateProfile, isUpdating, isSuccess, error, reset: resetMutation } = useUpdateProfile();

  const {
    register,
    handleSubmit,
    control,
    reset: resetForm,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileFormSchemaValues>({
    resolver: zodResolver(updateProfileFormSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      countryId: user.countryId ?? '',
    },
  });

  const onSubmit = async (values: UpdateProfileFormSchemaValues) => {
    resetMutation();
    try {
      await updateProfile(values);
      // Re-baseline the form against the just-saved values so `isDirty`
      // flips back to `false` - otherwise the success message below would
      // never show once any field has been edited (`isDirty` compares
      // against the form's original `defaultValues`, which never move on
      // their own).
      resetForm(values);
    } catch {
      // Surfaced via `error` below.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">Profile details</h2>
        <p className="mt-1 text-sm text-zinc-500">Update your personal information and country.</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {isSuccess && !isDirty && <Alert variant="success">Your profile has been updated.</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            autoComplete="given-name"
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
            autoComplete="family-name"
            hasError={Boolean(errors.lastName)}
            aria-describedby={errors.lastName ? 'lastName-error' : undefined}
            {...register('lastName')}
          />
          <FieldError id="lastName-error" message={errors.lastName?.message} />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          hasError={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        <FieldError id="email-error" message={errors.email?.message} />
      </div>

      <div>
        <Label htmlFor="countryId">Country</Label>
        <Controller
          name="countryId"
          control={control}
          render={({ field }) => (
            <CountrySearchCombobox
              id="countryId"
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              hasError={Boolean(errors.countryId)}
              aria-describedby={errors.countryId ? 'countryId-error' : undefined}
            />
          )}
        />
        <FieldError id="countryId-error" message={errors.countryId?.message} />
      </div>

      <div className="flex justify-end border-t border-zinc-200 pt-4">
        <Button type="submit" isLoading={isUpdating}>
          {isUpdating ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
