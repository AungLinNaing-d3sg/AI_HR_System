'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useCountries } from '@/hooks/useCountries';
import { useCreateRateCard } from '@/hooks/useCreateRateCard';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useResourceRoleTypes } from '@/hooks/useResourceRoleTypes';
import { useUpdateRateCard } from '@/hooks/useUpdateRateCard';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import {
  createRateCardSchema,
  type CreateRateCardFormValues,
  type RateCardFormFieldValues,
} from '@/lib/validators/rateCard.validators';
import type { RateCard } from '@/types/domain.types';

export interface RateCardFormProps {
  mode: 'create' | 'edit';
  /** Required when `mode === 'edit'`; supplies the pre-filled values and the id to update. */
  rateCard?: RateCard;
  /** Called after a successful create/update so the parent modal can close itself. */
  onSuccess: () => void;
  /** Called when the user cancels out of the form without saving. */
  onCancel: () => void;
}

function toFormValues(rateCard?: RateCard): RateCardFormFieldValues {
  return {
    countryId: rateCard?.country.id ?? '',
    resourceRoleTypeId: rateCard?.resourceRoleType.id ?? '',
    currencyId: rateCard?.currency.id ?? '',
    hourlyRate: rateCard?.hourlyRate ?? '',
    billingRate: rateCard?.billingRate ?? '',
    effectiveDate: rateCard?.effectiveDate ?? '',
    isActive: rateCard?.isActive ?? true,
  };
}

/**
 * Shared Create/Edit rate card form, rendered inside `RateCardsTable`'s
 * modal (mirrors `CurrencyForm`/`ExchangeRateForm`'s modal-hosted pattern -
 * the wireframe, `docs/HR_System_FE_wireframe.pdf`, shows only the
 * `/admin/rate-cards` table itself, with "+ Add Rate Card"/"Edit" actions
 * and no separate routed pages for either).
 *
 * In create mode, country/role/currency are selected from the reference-data
 * dropdowns (`useCountries`/`useResourceRoleTypes`/`useCurrencies`) - unlike
 * Exchange Rate's `fromCurrencyId` (always resolved server-side from the
 * current base currency), these are legitimately user-selected values with
 * no single "current" value to default to. In edit mode, the
 * country/role/currency are shown read-only and only hourly rate/billing
 * rate/effective date/status are editable, since the backend's
 * `UpdateRateCard` endpoint doesn't accept them (see
 * `updateRateCardSchema`'s comment) - a rate card's country/role/currency
 * are fixed at creation time, mirroring `CurrencyForm`'s "fixed after
 * creation" fields.
 */
export function RateCardForm({ mode, rateCard, onSuccess, onCancel }: RateCardFormProps) {
  const isEditMode = mode === 'edit';

  const {
    countries,
    isLoading: isLoadingCountries,
    isError: isCountriesError,
    error: countriesError,
  } = useCountries();
  const {
    roleTypes,
    isLoading: isLoadingRoleTypes,
    isError: isRoleTypesError,
    error: roleTypesError,
  } = useResourceRoleTypes();
  const {
    currencies,
    isLoading: isLoadingCurrencies,
    isError: isCurrenciesError,
    error: currenciesError,
  } = useCurrencies();

  const { createRateCard, isCreating, error: createError, reset: resetCreate } = useCreateRateCard();
  const {
    updateRateCard,
    isUpdating,
    error: updateError,
    reset: resetUpdate,
  } = useUpdateRateCard(rateCard?.id ?? '');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RateCardFormFieldValues, unknown, CreateRateCardFormValues>({
    resolver: zodResolver(createRateCardSchema),
    defaultValues: toFormValues(rateCard),
  });

  const isSubmitting = isEditMode ? isUpdating : isCreating;
  const submitError = isEditMode ? updateError : createError;
  const isReferenceDataLoading = isLoadingCountries || isLoadingRoleTypes || isLoadingCurrencies;
  const referenceDataError = isCountriesError
    ? (countriesError ?? 'Could not load countries.')
    : isRoleTypesError
      ? (roleTypesError ?? 'Could not load resource role types.')
      : isCurrenciesError
        ? (currenciesError ?? 'Could not load currencies.')
        : null;
  const canSubmit = isEditMode || (!isReferenceDataLoading && !referenceDataError);

  const onSubmit = async (values: CreateRateCardFormValues) => {
    resetCreate();
    resetUpdate();
    try {
      if (isEditMode) {
        // `UpdateRateCard` doesn't accept `countryId`/`resourceRoleTypeId`/
        // `currencyId` (see docs/HR_System_BE.postman_collection.json), so
        // only the fields it does accept are forwarded here.
        const { hourlyRate, billingRate, effectiveDate, isActive } = values;
        await updateRateCard({ hourlyRate, billingRate, effectiveDate, isActive });
      } else {
        await createRateCard(values);
      }
      onSuccess();
    } catch {
      // Surfaced via `submitError` below.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {submitError && <Alert variant="error">{submitError}</Alert>}
      {!isEditMode && referenceDataError && <Alert variant="error">{referenceDataError}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        {isEditMode ? (
          <>
            <div>
              <Label htmlFor="country">Country</Label>
              <p
                id="country"
                className="flex h-10 items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700"
              >
                {rateCard?.country.name} ({rateCard?.country.code})
              </p>
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <p
                id="role"
                className="flex h-10 items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700"
              >
                {rateCard?.resourceRoleType.name}
              </p>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="currency">Currency</Label>
              <p
                id="currency"
                className="flex h-10 items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700"
              >
                {rateCard?.currency.code} ({rateCard?.currency.symbol})
              </p>
            </div>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="countryId">Country</Label>
              <Select
                id="countryId"
                hasError={Boolean(errors.countryId)}
                aria-describedby={errors.countryId ? 'countryId-error' : undefined}
                disabled={isLoadingCountries}
                {...register('countryId')}
              >
                <option value="">{isLoadingCountries ? 'Loading countries…' : 'Select a country…'}</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name} ({country.code})
                  </option>
                ))}
              </Select>
              <FieldError id="countryId-error" message={errors.countryId?.message} />
            </div>

            <div>
              <Label htmlFor="resourceRoleTypeId">Role</Label>
              <Select
                id="resourceRoleTypeId"
                hasError={Boolean(errors.resourceRoleTypeId)}
                aria-describedby={errors.resourceRoleTypeId ? 'resourceRoleTypeId-error' : undefined}
                disabled={isLoadingRoleTypes}
                {...register('resourceRoleTypeId')}
              >
                <option value="">{isLoadingRoleTypes ? 'Loading roles…' : 'Select a role…'}</option>
                {roleTypes.map((roleType) => (
                  <option key={roleType.id} value={roleType.id}>
                    {roleType.name}
                  </option>
                ))}
              </Select>
              <FieldError id="resourceRoleTypeId-error" message={errors.resourceRoleTypeId?.message} />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="currencyId">Currency</Label>
              <Select
                id="currencyId"
                hasError={Boolean(errors.currencyId)}
                aria-describedby={errors.currencyId ? 'currencyId-error' : undefined}
                disabled={isLoadingCurrencies}
                {...register('currencyId')}
              >
                <option value="">{isLoadingCurrencies ? 'Loading currencies…' : 'Select a currency…'}</option>
                {currencies.map((currency) => (
                  <option key={currency.id} value={currency.id}>
                    {currency.code} — {currency.name}
                  </option>
                ))}
              </Select>
              <FieldError id="currencyId-error" message={errors.currencyId?.message} />
            </div>
          </>
        )}

        <div>
          <Label htmlFor="hourlyRate">Hourly rate</Label>
          <Input
            id="hourlyRate"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="e.g. 25.00"
            hasError={Boolean(errors.hourlyRate)}
            aria-describedby={errors.hourlyRate ? 'hourlyRate-error' : 'hourlyRate-help'}
            {...register('hourlyRate')}
          />
          <p id="hourlyRate-help" className="mt-1 text-xs text-zinc-500">
            Internal cost rate paid per hour worked.
          </p>
          <FieldError id="hourlyRate-error" message={errors.hourlyRate?.message} />
        </div>

        <div>
          <Label htmlFor="billingRate">Billing rate (per day)</Label>
          <Input
            id="billingRate"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="e.g. 700.00"
            hasError={Boolean(errors.billingRate)}
            aria-describedby={errors.billingRate ? 'billingRate-error' : 'billingRate-help'}
            {...register('billingRate')}
          />
          <p id="billingRate-help" className="mt-1 text-xs text-zinc-500">
            Rate charged to the client per day on invoices.
          </p>
          <FieldError id="billingRate-error" message={errors.billingRate?.message} />
        </div>

        <div>
          <Label htmlFor="effectiveDate">Effective date</Label>
          <Input
            id="effectiveDate"
            type="date"
            hasError={Boolean(errors.effectiveDate)}
            aria-describedby={errors.effectiveDate ? 'effectiveDate-error' : undefined}
            {...register('effectiveDate')}
          />
          <FieldError id="effectiveDate-error" message={errors.effectiveDate?.message} />
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
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} disabled={!canSubmit}>
          {isSubmitting ? 'Saving…' : isEditMode ? 'Save changes' : 'Add Rate Card'}
        </Button>
      </div>
    </form>
  );
}
