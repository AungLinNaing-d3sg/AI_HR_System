'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as timesheetsApi from '@/lib/api/timesheets.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Locks a timesheet period and invalidates the `['timesheets', 'periods']` list so it refetches with the new status. */
export function useLockTimesheetPeriod() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => timesheetsApi.lockTimesheetPeriod(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timesheets', 'periods'] });
    },
  });

  return {
    lockTimesheetPeriod: mutation.mutateAsync,
    isLocking: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not lock this timesheet period.') : null,
    reset: mutation.reset,
  };
}
