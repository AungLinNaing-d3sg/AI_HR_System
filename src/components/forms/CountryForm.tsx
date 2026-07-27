'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useCreateCountry } from '@/hooks/useCreateCountry';
import { useUpdateCountry } from '@/hooks/useUpdateCountry';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  createCountrySchema,
  type CreateCountryFormValues,
  type CountryFormFieldValues,
} from '@/lib/validators/country.validators';
import type { Country } from '@/types/domain.types';

export interface CountryFormProps {
  mode: 'create' | 'edit';
  /** Required when `mode === 'edit'`; supplies the pre-filled values and the id to update. */
  country?: Country;
  /** Called after a successful create/update so the parent modal can close itself. */
  onSuccess: () => void;
  /** Called when the user cancels out of the form without saving. */
  onCancel: () => void;
}

function toFormValues(country?: Country): CountryFormFieldValues {
  return {
    code: country?.code ?? '',
    name: country?.name ?? '',
  };
}

/**
 * Shared Create/Edit country form, rendered inside `CountriesTable`'s modal
 * (the wireframe - `docs/HR_System_FE_wireframe.pdf` - shows only the
 * `/admin/countries` table itself, with "+ Add Country"/"Edit" actions and
 * no separate routed pages for either, mirroring `/admin/currencies`).
 *
 * Both modes are validated against `createCountrySchema` (the superset that
 * also requires `code`) so a single, fully-typed `useForm` instance can serve
 * both flows - mirroring `CurrencyForm`/`createCurrencySchema`. In edit mode,
 * `code` is pre-filled but not rendered as an editable input, since the
 * backend's `UpdateCountry` endpoint does not accept it (see
 * docs/HR_System_BE.postman_collection.json) - only `Name` can change after
 * creation.
 */
export function CountryForm({ mode, country, onSuccess, onCancel }: CountryFormProps) {
  const isEditMode = mode === 'edit';

  const { createCountry, isCreating, error: createError, reset: resetCreate } = useCreateCountry();
  const {
    updateCountry,
    isUpdating,
    error: updateError,
    reset: resetUpdate,
  } = useUpdateCountry(country?.id ?? '');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CountryFormFieldValues, unknown, CreateCountryFormValues>({
    resolver: zodResolver(createCountrySchema),
    defaultValues: toFormValues(country),
  });

  const isSubmitting = isEditMode ? isUpdating : isCreating;
  const submitError = isEditMode ? updateError : createError;

  const onSubmit = async (values: CreateCountryFormValues) => {
    resetCreate();
    resetUpdate();
    try {
      if (isEditMode) {
        // `UpdateCountry` doesn't accept `code` (see
        // docs/HR_System_BE.postman_collection.json), so only `name` is
        // forwarded here.
        await updateCountry({ name: values.name });
      } else {
        await createCountry(values);
      }
      onSuccess();
    } catch {
      // Surfaced via `submitError` below.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {submitError && <Alert variant="error">{submitError}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        {!isEditMode && (
          <div>
            <Label htmlFor="code">Country code</Label>
            <Input
              id="code"
              autoComplete="off"
              placeholder="e.g. SG"
              maxLength={2}
              hasError={Boolean(errors.code)}
              aria-describedby={errors.code ? 'code-error' : 'code-help'}
              {...register('code')}
            />
            <p id="code-help" className="mt-1 text-xs text-zinc-500">
              Unique ISO 3166-1 alpha-2 code (2 letters).
            </p>
            <FieldError id="code-error" message={errors.code?.message} />
          </div>
        )}

        <div className={isEditMode ? 'sm:col-span-2' : undefined}>
          <Label htmlFor="name">Country name</Label>
          <Input
            id="name"
            autoComplete="off"
            placeholder="e.g. Singapore"
            hasError={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
            {...register('name')}
          />
          <FieldError id="name-error" message={errors.name?.message} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEditMode ? 'Save changes' : 'Add Country'}
        </Button>
      </div>
    </form>
  );
}
