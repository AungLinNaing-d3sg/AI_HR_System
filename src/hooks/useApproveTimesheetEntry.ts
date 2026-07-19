'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as timesheetsApi from '@/lib/api/timesheets.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Approves a timesheet entry and invalidates the cached history list. */
export function useApproveTimesheetEntry() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => timesheetsApi.approveTimesheetEntry(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timesheets', 'history'] });
    },
  });

  return {
    approveEntry: mutation.mutateAsync,
    isApproving: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not approve this timesheet entry.') : null,
    reset: mutation.reset,
  };
}
