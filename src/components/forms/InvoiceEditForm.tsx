'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useUpdateInvoice } from '@/hooks/useUpdateInvoice';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { updateInvoiceSchema, type UpdateInvoiceFormValues } from '@/lib/validators/invoice.validators';
import type { InvoiceDetail } from '@/types/domain.types';

export interface InvoiceEditFormProps {
  invoice: InvoiceDetail;
  onCancel: () => void;
  onSaved: () => void;
}

function toFormValues(invoice: InvoiceDetail): UpdateInvoiceFormValues {
  return {
    currencyId: invoice.currency.id,
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail ?? '',
    issuedDate: invoice.issuedDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes ?? '',
  };
}

/**
 * Edit form for a Draft invoice's editable fields (`Invoice/UpdateInvoice`
 * only accepts these on a `Draft` invoice - see
 * docs/HR_System_BE.postman_collection.json). Rendered inline on
 * `/invoices/[id]` (via `InvoiceDetailPanel`) when the caller clicks "Edit",
 * rather than a separate route - the wireframe has no distinct edit page for
 * an invoice.
 */
export function InvoiceEditForm({ invoice, onCancel, onSaved }: InvoiceEditFormProps) {
  const { currencies, isLoading: isLoadingCurrencies, isError: isCurrenciesError, error: currenciesError } =
    useCurrencies();
  const { updateInvoice, isUpdating, error, reset: resetError } = useUpdateInvoice(invoice.id);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateInvoiceFormValues>({
    resolver: zodResolver(updateInvoiceSchema),
    defaultValues: toFormValues(invoice),
  });

  const onSubmit = async (values: UpdateInvoiceFormValues) => {
    resetError();
    try {
      await updateInvoice(values);
      onSaved();
    } catch {
      // Surfaced via `error` below.
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-zinc-900">Edit invoice</h2>

      {error && <Alert variant="error">{error}</Alert>}
      {isCurrenciesError && <Alert variant="error">{currenciesError ?? 'Could not load currencies.'}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="edit-clientName">Client name</Label>
          <Input
            id="edit-clientName"
            autoComplete="off"
            hasError={Boolean(errors.clientName)}
            aria-describedby={errors.clientName ? 'edit-clientName-error' : undefined}
            {...register('clientName')}
          />
          <FieldError id="edit-clientName-error" message={errors.clientName?.message} />
        </div>

        <div>
          <Label htmlFor="edit-clientEmail">Client email (optional)</Label>
          <Input
            id="edit-clientEmail"
            type="email"
            autoComplete="off"
            hasError={Boolean(errors.clientEmail)}
            aria-describedby={errors.clientEmail ? 'edit-clientEmail-error' : undefined}
            {...register('clientEmail')}
          />
          <FieldError id="edit-clientEmail-error" message={errors.clientEmail?.message} />
        </div>

        <div>
          <Label htmlFor="edit-currencyId">Currency</Label>
          <Select
            id="edit-currencyId"
            hasError={Boolean(errors.currencyId)}
            aria-describedby={errors.currencyId ? 'edit-currencyId-error' : undefined}
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
          <FieldError id="edit-currencyId-error" message={errors.currencyId?.message} />
        </div>

        <div>
          <Label htmlFor="edit-issuedDate">Issued date</Label>
          <Input
            id="edit-issuedDate"
            type="date"
            hasError={Boolean(errors.issuedDate)}
            aria-describedby={errors.issuedDate ? 'edit-issuedDate-error' : undefined}
            {...register('issuedDate')}
          />
          <FieldError id="edit-issuedDate-error" message={errors.issuedDate?.message} />
        </div>

        <div>
          <Label htmlFor="edit-dueDate">Due date</Label>
          <Input
            id="edit-dueDate"
            type="date"
            hasError={Boolean(errors.dueDate)}
            aria-describedby={errors.dueDate ? 'edit-dueDate-error' : undefined}
            {...register('dueDate')}
          />
          <FieldError id="edit-dueDate-error" message={errors.dueDate?.message} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="edit-notes">Notes (optional)</Label>
          <Textarea
            id="edit-notes"
            hasError={Boolean(errors.notes)}
            aria-describedby={errors.notes ? 'edit-notes-error' : undefined}
            {...register('notes')}
          />
          <FieldError id="edit-notes-error" message={errors.notes?.message} />
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
