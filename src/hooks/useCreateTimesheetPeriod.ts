'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as timesheetsApi from '@/lib/api/timesheets.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { CreateTimesheetPeriodFormValues } from '@/lib/validators/timesheet.validators';

/** Creates a new timesheet period and invalidates the `['timesheets', 'periods']` list so it refetches with the new entry. */
export function useCreateTimesheetPeriod() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: CreateTimesheetPeriodFormValues) => timesheetsApi.createTimesheetPeriod(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timesheets', 'periods'] });
    },
  });

  return {
    createTimesheetPeriod: mutation.mutateAsync,
    isCreating: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not create the timesheet period.') : null,
    reset: mutation.reset,
  };
}
