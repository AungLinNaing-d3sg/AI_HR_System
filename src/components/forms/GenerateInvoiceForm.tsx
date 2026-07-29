'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useGenerateInvoice } from '@/hooks/useGenerateInvoice';
import { useProjects } from '@/hooks/useProjects';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { INVOICE_TAX_RATE_NOTE } from '@/lib/constants/invoice.constants';
import { generateInvoiceSchema, type GenerateInvoiceFormValues } from '@/lib/validators/invoice.validators';

function formatDateDisplay(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const DEFAULT_VALUES: GenerateInvoiceFormValues = {
  projectId: '',
  billingPeriodStart: '',
  billingPeriodEnd: '',
  currencyId: '',
  clientName: '',
  clientEmail: '',
  issuedDate: '',
  dueDate: '',
  notes: '',
};

/**
 * `/invoices/generate` form (`docs/HR_System_FE_wireframe.pdf`). The
 * wireframe's mockup shows a "Preview Line Items" step that displays a
 * computed line-items table + totals before a second "Generate Invoice"
 * click - but the real `Invoice/GenerateInvoice` endpoint (see
 * docs/HR_System_BE.postman_collection.json) has no separate dry-run/preview
 * capability: calling it *is* what computes the line items, and it
 * immediately persists the invoice as `Draft`. Rather than fabricate a
 * client-side "preview" of numbers the backend hasn't computed yet, this
 * form keeps the wireframe's two-step feel with a real review step (the
 * entered parameters, read back for confirmation) before the actual
 * `Invoice/GenerateInvoice` call fires on the final "Generate Invoice" click.
 */
export function GenerateInvoiceForm() {
  const router = useRouter();
  const [step, setStep] = useState<'parameters' | 'review'>('parameters');
  const [reviewValues, setReviewValues] = useState<GenerateInvoiceFormValues | null>(null);

  const { projects, isLoading: isLoadingProjects } = useProjects();
  const { currencies, isLoading: isLoadingCurrencies, isError: isCurrenciesError, error: currenciesError } =
    useCurrencies();
  const { generateInvoice, isGenerating, error: generateError, reset: resetGenerateError } = useGenerateInvoice();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GenerateInvoiceFormValues>({
    resolver: zodResolver(generateInvoiceSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const selectedProject = projects.find((project) => project.id === reviewValues?.projectId);
  const selectedCurrency = currencies.find((currency) => currency.id === reviewValues?.currencyId);

  const onReview = (values: GenerateInvoiceFormValues) => {
    setReviewValues(values);
    setStep('review');
  };

  const handleBack = () => {
    setStep('parameters');
  };

  const handleGenerate = async () => {
    if (!reviewValues) return;
    resetGenerateError();
    try {
      const invoice = await generateInvoice(reviewValues);
      router.push(`/invoices/${invoice.id}`);
    } catch {
      // Surfaced via `generateError` below; stay on the review step so the user can retry.
    }
  };

  if (step === 'review' && reviewValues) {
    return (
      <div className="w-full max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Review invoice details</h2>
          <p className="text-sm text-zinc-500">Confirm these details before generating the invoice.</p>
        </div>

        {generateError && <Alert variant="error">{generateError}</Alert>}

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-zinc-500">Project</dt>
            <dd className="text-sm text-zinc-900">{selectedProject?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-zinc-500">Client</dt>
            <dd className="text-sm text-zinc-900">{reviewValues.clientName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-zinc-500">Billing period</dt>
            <dd className="text-sm text-zinc-900">
              {formatDateDisplay(reviewValues.billingPeriodStart)} – {formatDateDisplay(reviewValues.billingPeriodEnd)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-zinc-500">Currency</dt>
            <dd className="text-sm text-zinc-900">
              {selectedCurrency ? `${selectedCurrency.code} — ${selectedCurrency.name}` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-zinc-500">Issued date</dt>
            <dd className="text-sm text-zinc-900">{formatDateDisplay(reviewValues.issuedDate)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-zinc-500">Due date</dt>
            <dd className="text-sm text-zinc-900">{formatDateDisplay(reviewValues.dueDate)}</dd>
          </div>
          {reviewValues.clientEmail && (
            <div>
              <dt className="text-xs font-medium uppercase text-zinc-500">Client email</dt>
              <dd className="text-sm text-zinc-900">{reviewValues.clientEmail}</dd>
            </div>
          )}
          {reviewValues.notes && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase text-zinc-500">Notes</dt>
              <dd className="text-sm text-zinc-900">{reviewValues.notes}</dd>
            </div>
          )}
        </dl>

        <p className="text-xs text-zinc-500">
          Line items and totals are computed by the backend from approved timesheet entries for this project and
          billing period when the invoice is generated.
        </p>

        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-4">
          <Button type="button" variant="outline" onClick={handleBack} disabled={isGenerating}>
            Back
          </Button>
          <Button type="button" isLoading={isGenerating} onClick={handleGenerate}>
            {isGenerating ? 'Generating…' : 'Generate Invoice'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onReview)}
      noValidate
      className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-1 text-sm font-semibold text-zinc-900">1. Invoice Parameters</h2>
      <p className="mb-4 text-sm text-zinc-500">Create a new invoice from approved timesheet entries.</p>

      {isCurrenciesError && <Alert variant="error">{currenciesError ?? 'Could not load currencies.'}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="projectId">Project</Label>
          <Select
            id="projectId"
            hasError={Boolean(errors.projectId)}
            aria-describedby={errors.projectId ? 'projectId-error' : undefined}
            disabled={isLoadingProjects}
            {...register('projectId')}
          >
            <option value="">{isLoadingProjects ? 'Loading projects…' : 'Select a project…'}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          <FieldError id="projectId-error" message={errors.projectId?.message} />
        </div>

        <div>
          <Label htmlFor="billingPeriodStart">Billing Period From</Label>
          <Input
            id="billingPeriodStart"
            type="date"
            hasError={Boolean(errors.billingPeriodStart)}
            aria-describedby={errors.billingPeriodStart ? 'billingPeriodStart-error' : undefined}
            {...register('billingPeriodStart')}
          />
          <FieldError id="billingPeriodStart-error" message={errors.billingPeriodStart?.message} />
        </div>

        <div>
          <Label htmlFor="billingPeriodEnd">Billing Period To</Label>
          <Input
            id="billingPeriodEnd"
            type="date"
            hasError={Boolean(errors.billingPeriodEnd)}
            aria-describedby={errors.billingPeriodEnd ? 'billingPeriodEnd-error' : undefined}
            {...register('billingPeriodEnd')}
          />
          <FieldError id="billingPeriodEnd-error" message={errors.billingPeriodEnd?.message} />
        </div>

        <div>
          <Label htmlFor="currencyId">Invoice Currency</Label>
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
                {currency.isBaseCurrency ? ' (Base)' : ''}
              </option>
            ))}
          </Select>
          <FieldError id="currencyId-error" message={errors.currencyId?.message} />
        </div>

        <div>
          <Label htmlFor="taxRate">Tax Rate (%)</Label>
          <Input id="taxRate" value="Calculated automatically" disabled readOnly aria-describedby="taxRate-help" />
          <p id="taxRate-help" className="mt-1 text-xs text-zinc-500">
            {INVOICE_TAX_RATE_NOTE}
          </p>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="clientName">Client name</Label>
          <Input
            id="clientName"
            autoComplete="off"
            placeholder="e.g. Acme Corp"
            hasError={Boolean(errors.clientName)}
            aria-describedby={errors.clientName ? 'clientName-error' : undefined}
            {...register('clientName')}
          />
          <FieldError id="clientName-error" message={errors.clientName?.message} />
        </div>

        <div>
          <Label htmlFor="clientEmail">Client email (optional)</Label>
          <Input
            id="clientEmail"
            type="email"
            autoComplete="off"
            placeholder="e.g. billing@acme.com"
            hasError={Boolean(errors.clientEmail)}
            aria-describedby={errors.clientEmail ? 'clientEmail-error' : undefined}
            {...register('clientEmail')}
          />
          <FieldError id="clientEmail-error" message={errors.clientEmail?.message} />
        </div>

        <div>
          <Label htmlFor="issuedDate">Issued date</Label>
          <Input
            id="issuedDate"
            type="date"
            hasError={Boolean(errors.issuedDate)}
            aria-describedby={errors.issuedDate ? 'issuedDate-error' : undefined}
            {...register('issuedDate')}
          />
          <FieldError id="issuedDate-error" message={errors.issuedDate?.message} />
        </div>

        <div>
          <Label htmlFor="dueDate">Due date</Label>
          <Input
            id="dueDate"
            type="date"
            hasError={Boolean(errors.dueDate)}
            aria-describedby={errors.dueDate ? 'dueDate-error' : undefined}
            {...register('dueDate')}
          />
          <FieldError id="dueDate-error" message={errors.dueDate?.message} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Optional notes to include on the invoice…"
            hasError={Boolean(errors.notes)}
            aria-describedby={errors.notes ? 'notes-error' : undefined}
            {...register('notes')}
          />
          <FieldError id="notes-error" message={errors.notes?.message} />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-200 pt-4">
        <Button type="button" variant="outline" onClick={() => router.push('/invoices')}>
          Cancel
        </Button>
        <Button type="submit">Preview &amp; Review</Button>
      </div>
    </form>
  );
}
