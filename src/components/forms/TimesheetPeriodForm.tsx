'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useCreateTimesheetPeriod } from '@/hooks/useCreateTimesheetPeriod';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  createTimesheetPeriodSchema,
  type CreateTimesheetPeriodFormValues,
} from '@/lib/validators/timesheet.validators';

/** Creates a new timesheet period (`Start date`/`End date`), backing the `/timesheets/periods` "New Period" card. */
export function TimesheetPeriodForm() {
  const { createTimesheetPeriod, isCreating, isSuccess, error, reset: resetMutation } = useCreateTimesheetPeriod();

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<CreateTimesheetPeriodFormValues>({
    resolver: zodResolver(createTimesheetPeriodSchema),
    defaultValues: { periodStart: '', periodEnd: '' },
  });

  const onSubmit = async (values: CreateTimesheetPeriodFormValues) => {
    resetMutation();
    try {
      await createTimesheetPeriod(values);
      resetForm();
    } catch {
      // Surfaced via `error` below.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">New Timesheet Period</h2>
      <p className="mb-4 text-sm text-zinc-500">Create a new payroll period to log hours against.</p>

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {isSuccess && (
        <div className="mb-4">
          <Alert variant="success">Timesheet period created.</Alert>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="periodStart">Start date</Label>
          <Input
            id="periodStart"
            type="date"
            hasError={Boolean(errors.periodStart)}
            aria-describedby={errors.periodStart ? 'periodStart-error' : undefined}
            {...register('periodStart')}
          />
          <FieldError id="periodStart-error" message={errors.periodStart?.message} />
        </div>

        <div>
          <Label htmlFor="periodEnd">End date</Label>
          <Input
            id="periodEnd"
            type="date"
            hasError={Boolean(errors.periodEnd)}
            aria-describedby={errors.periodEnd ? 'periodEnd-error' : undefined}
            {...register('periodEnd')}
          />
          <FieldError id="periodEnd-error" message={errors.periodEnd?.message} />
        </div>

        <Button type="submit" isLoading={isCreating}>
          {isCreating ? 'Creating…' : 'Create Period'}
        </Button>
      </div>
    </form>
  );
}
