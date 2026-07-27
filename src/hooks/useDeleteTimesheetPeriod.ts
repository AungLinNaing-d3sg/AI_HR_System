'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as timesheetsApi from '@/lib/api/timesheets.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Deletes a timesheet period and invalidates the `['timesheets', 'periods']` list so it refetches without it. */
export function useDeleteTimesheetPeriod() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => timesheetsApi.deleteTimesheetPeriod(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timesheets', 'periods'] });
    },
  });

  return {
    deleteTimesheetPeriod: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not delete this timesheet period.') : null,
    reset: mutation.reset,
  };
}
