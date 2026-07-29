'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useCreateCurrency } from '@/hooks/useCreateCurrency';
import { useUpdateCurrency } from '@/hooks/useUpdateCurrency';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import {
  createCurrencySchema,
  type CreateCurrencyFormValues,
  type CurrencyFormFieldValues,
} from '@/lib/validators/currency.validators';
import type { Currency } from '@/types/domain.types';

export interface CurrencyFormProps {
  mode: 'create' | 'edit';
  /** Required when `mode === 'edit'`; supplies the pre-filled values and the id to update. */
  currency?: Currency;
  /** Called after a successful create/update so the parent modal can close itself. */
  onSuccess: () => void;
  /** Called when the user cancels out of the form without saving. */
  onCancel: () => void;
}

function toFormValues(currency?: Currency): CurrencyFormFieldValues {
  return {
    code: currency?.code ?? '',
    name: currency?.name ?? '',
    symbol: currency?.symbol ?? '',
    isBaseCurrency: currency?.isBaseCurrency ?? false,
    isActive: currency?.isActive ?? true,
  };
}

/**
 * Shared Create/Edit currency form, rendered inside `CurrenciesTable`'s
 * modal (the wireframe - `docs/HR_System_FE_wireframe.pdf` - shows only the
 * `/admin/currencies` table itself, with "+ Add Currency"/"Edit" actions and
 * no separate routed pages for either, unlike Projects' `/projects/new` and
 * `/projects/:id`).
 *
 * Both modes are validated against `createCurrencySchema` (the superset that
 * also requires `code`/`isBaseCurrency`) so a single, fully-typed `useForm`
 * instance can serve both flows - mirroring `ProjectForm`/
 * `updateProjectSchema`. In edit mode, `code` and "Set as base currency" are
 * pre-filled but not rendered as editable inputs, since the backend's
 * `UpdateCurrency` endpoint does not accept either field (see
 * docs/HR_System_BE.postman_collection.json) - only `Name`/`Symbol`/
 * `IsActive` can change after creation.
 */
export function CurrencyForm({ mode, currency, onSuccess, onCancel }: CurrencyFormProps) {
  const isEditMode = mode === 'edit';

  const { createCurrency, isCreating, error: createError, reset: resetCreate } = useCreateCurrency();
  const {
    updateCurrency,
    isUpdating,
    error: updateError,
    reset: resetUpdate,
  } = useUpdateCurrency(currency?.id ?? '');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CurrencyFormFieldValues, unknown, CreateCurrencyFormValues>({
    resolver: zodResolver(createCurrencySchema),
    defaultValues: toFormValues(currency),
  });

  const isSubmitting = isEditMode ? isUpdating : isCreating;
  const submitError = isEditMode ? updateError : createError;

  const onSubmit = async (values: CreateCurrencyFormValues) => {
    resetCreate();
    resetUpdate();
    try {
      if (isEditMode) {
        // `UpdateCurrency` doesn't accept `code`/`isBaseCurrency` (see
        // docs/HR_System_BE.postman_collection.json), so only the fields it
        // does accept are forwarded here.
        const { name, symbol, isActive } = values;
        await updateCurrency({ name, symbol, isActive });
      } else {
        await createCurrency(values);
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
            <Label htmlFor="code">Currency code</Label>
            <Input
              id="code"
              autoComplete="off"
              placeholder="e.g. USD"
              maxLength={3}
              hasError={Boolean(errors.code)}
              aria-describedby={errors.code ? 'code-error' : 'code-help'}
              {...register('code')}
            />
            <p id="code-help" className="mt-1 text-xs text-zinc-500">
              Unique ISO 4217 code (3 letters).
            </p>
            <FieldError id="code-error" message={errors.code?.message} />
          </div>
        )}

        <div>
          <Label htmlFor="name">Currency name</Label>
          <Input
            id="name"
            autoComplete="off"
            placeholder="e.g. US Dollar"
            hasError={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
            {...register('name')}
          />
          <FieldError id="name-error" message={errors.name?.message} />
        </div>

        <div>
          <Label htmlFor="symbol">Symbol</Label>
          <Input
            id="symbol"
            autoComplete="off"
            placeholder="e.g. $"
            hasError={Boolean(errors.symbol)}
            aria-describedby={errors.symbol ? 'symbol-error' : undefined}
            {...register('symbol')}
          />
          <FieldError id="symbol-error" message={errors.symbol?.message} />
        </div>

        {isEditMode && (
          <div>
            <Label htmlFor="isActive">Status</Label>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Select
                  id="isActive"
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
        )}

        {!isEditMode && (
          <div className="sm:col-span-2">
            <label htmlFor="isBaseCurrency" className="flex items-start gap-2 text-sm text-zinc-900">
              <input
                id="isBaseCurrency"
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-zinc-900"
                {...register('isBaseCurrency')}
              />
              <span>
                Set as base currency
                <span className="block text-xs font-normal text-zinc-500">
                  Only one currency can be the base at a time; setting this replaces the current base currency.
                </span>
              </span>
            </label>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEditMode ? 'Save changes' : 'Add Currency'}
        </Button>
      </div>
    </form>
  );
}
