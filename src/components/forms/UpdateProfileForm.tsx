'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { updateProfileSchema, type UpdateProfileFormValues } from '@/lib/validators/auth.validators';
import type { AuthenticatedUser } from '@/types/domain.types';

export function UpdateProfileForm({ user }: { user: AuthenticatedUser }) {
  const { updateProfile, isUpdating, isSuccess, error, reset } = useUpdateProfile();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      countryId: user.countryId,
    },
  });

  const onSubmit = async (values: UpdateProfileFormValues) => {
    reset();
    try {
      await updateProfile(values);
    } catch {
      // Surfaced via `error` below.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full max-w-md space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900">Profile details</h2>

      {error && <Alert variant="error">{error}</Alert>}
      {isSuccess && !isDirty && <Alert variant="success">Your profile has been updated.</Alert>}

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

      <input type="hidden" {...register('countryId')} />

      <Button type="submit" isLoading={isUpdating}>
        {isUpdating ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
