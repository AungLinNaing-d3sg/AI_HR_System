'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useCreateExchangeRate } from '@/hooks/useCreateExchangeRate';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useUpdateExchangeRate } from '@/hooks/useUpdateExchangeRate';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import {
  createExchangeRateSchema,
  type CreateExchangeRateFormValues,
  type ExchangeRateFormFieldValues,
} from '@/lib/validators/exchangeRate.validators';
import type { ExchangeRate } from '@/types/domain.types';

export interface ExchangeRateFormProps {
  mode: 'create' | 'edit';
  /** Required when `mode === 'edit'`; supplies the pre-filled values and the id to update. */
  exchangeRate?: ExchangeRate;
  /** Called after a successful create/update so the parent modal can close itself. */
  onSuccess: () => void;
  /** Called when the user cancels out of the form without saving. */
  onCancel: () => void;
}

function toFormValues(exchangeRate?: ExchangeRate): ExchangeRateFormFieldValues {
  return {
    toCurrencyId: exchangeRate?.toCurrency.id ?? '',
    rate: exchangeRate?.rate ?? '',
    effectiveDate: exchangeRate?.effectiveDate ?? '',
    isActive: exchangeRate?.isActive ?? true,
  };
}

/**
 * Shared Create/Edit exchange rate form, rendered inside
 * `ExchangeRatesTable`'s modal (mirrors `CurrencyForm`'s modal-hosted
 * pattern - the wireframe, `docs/HR_System_FE_wireframe.pdf`, shows only the
 * `/admin/exchange-rates` table itself, with "+ Add Rate"/"Edit" actions and
 * no separate routed pages for either).
 *
 * Every rate this form creates is always FROM the app's current base
 * currency (resolved server-side, never a client-editable field - see
 * `createExchangeRateSchema`'s comment), so only the target ("To") currency,
 * rate, and effective date are collected on create. In edit mode, the
 * currency pair is shown read-only and only `rate`/`effectiveDate`/
 * `isActive` are editable, mirroring `CurrencyForm`'s "fixed after creation"
 * fields.
 */
export function ExchangeRateForm({ mode, exchangeRate, onSuccess, onCancel }: ExchangeRateFormProps) {
  const isEditMode = mode === 'edit';

  const {
    currencies,
    isLoading: isLoadingCurrencies,
    isError: isCurrenciesError,
    error: currenciesError,
  } = useCurrencies();
  const baseCurrency = currencies.find((currency) => currency.isBaseCurrency) ?? null;
  const targetCurrencyOptions = baseCurrency
    ? currencies.filter((currency) => currency.id !== baseCurrency.id)
    : currencies;

  const { createExchangeRate, isCreating, error: createError, reset: resetCreate } = useCreateExchangeRate();
  const {
    updateExchangeRate,
    isUpdating,
    error: updateError,
    reset: resetUpdate,
  } = useUpdateExchangeRate(exchangeRate?.id ?? '');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ExchangeRateFormFieldValues, unknown, CreateExchangeRateFormValues>({
    resolver: zodResolver(createExchangeRateSchema),
    defaultValues: toFormValues(exchangeRate),
  });

  const watchedRate = useWatch({ control, name: 'rate' });
  const watchedToCurrencyId = useWatch({ control, name: 'toCurrencyId' });
  const selectedToCurrency = isEditMode
    ? exchangeRate?.toCurrency
    : targetCurrencyOptions.find((currency) => currency.id === watchedToCurrencyId);
  const numericRate = Number(watchedRate);
  const showRatePreview = Boolean(baseCurrency) && Boolean(selectedToCurrency) && Number.isFinite(numericRate) && numericRate > 0;

  const isSubmitting = isEditMode ? isUpdating : isCreating;
  const submitError = isEditMode ? updateError : createError;
  const canSubmit = isEditMode || Boolean(baseCurrency);

  const onSubmit = async (values: CreateExchangeRateFormValues) => {
    resetCreate();
    resetUpdate();
    try {
      if (isEditMode) {
        // `UpdateExchangeRate` doesn't accept `toCurrencyId` (see
        // docs/HR_System_BE.postman_collection.json), so only the fields it
        // does accept are forwarded here.
        const { rate, effectiveDate, isActive } = values;
        await updateExchangeRate({ rate, effectiveDate, isActive });
      } else {
        await createExchangeRate(values);
      }
      onSuccess();
    } catch {
      // Surfaced via `submitError` below.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {submitError && <Alert variant="error">{submitError}</Alert>}
      {isCurrenciesError && <Alert variant="error">{currenciesError ?? 'Could not load currencies.'}</Alert>}
      {!isEditMode && !isLoadingCurrencies && !isCurrenciesError && !baseCurrency && (
        <Alert variant="error">
          No base currency is configured. Set a base currency on Currencies before adding exchange rates.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="fromCurrency">From currency</Label>
          <p
            id="fromCurrency"
            className="flex h-10 items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700"
          >
            {isEditMode
              ? exchangeRate?.fromCurrency.code
              : baseCurrency
                ? `${baseCurrency.code} — ${baseCurrency.name} (Base currency)`
                : isLoadingCurrencies
                  ? 'Loading currencies…'
                  : 'No base currency configured'}
          </p>
        </div>

        {isEditMode ? (
          <div className="sm:col-span-2">
            <Label htmlFor="toCurrency">To currency</Label>
            <p
              id="toCurrency"
              className="flex h-10 items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700"
            >
              {exchangeRate?.toCurrency.code}
            </p>
          </div>
        ) : (
          <div className="sm:col-span-2">
            <Label htmlFor="toCurrencyId">To currency</Label>
            <Select
              id="toCurrencyId"
              hasError={Boolean(errors.toCurrencyId)}
              aria-describedby={errors.toCurrencyId ? 'toCurrencyId-error' : undefined}
              disabled={isLoadingCurrencies || !baseCurrency}
              {...register('toCurrencyId')}
            >
              <option value="">{isLoadingCurrencies ? 'Loading currencies…' : 'Select a target currency…'}</option>
              {targetCurrencyOptions.map((currency) => (
                <option key={currency.id} value={currency.id}>
                  {currency.code} — {currency.name}
                </option>
              ))}
            </Select>
            <FieldError id="toCurrencyId-error" message={errors.toCurrencyId?.message} />
          </div>
        )}

        <div>
          <Label htmlFor="rate">Rate</Label>
          <Input
            id="rate"
            type="number"
            inputMode="decimal"
            step="0.0001"
            min="0"
            placeholder="e.g. 0.74"
            hasError={Boolean(errors.rate)}
            aria-describedby={errors.rate ? 'rate-error' : showRatePreview ? 'rate-help' : undefined}
            {...register('rate')}
          />
          {showRatePreview && (
            <p id="rate-help" className="mt-1 text-xs text-zinc-500">
              1 {baseCurrency?.code ?? exchangeRate?.fromCurrency.code} = {numericRate} {selectedToCurrency?.code}
            </p>
          )}
          <FieldError id="rate-error" message={errors.rate?.message} />
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
          {isSubmitting ? 'Saving…' : isEditMode ? 'Save changes' : 'Add Rate'}
        </Button>
      </div>
    </form>
  );
}
