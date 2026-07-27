'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as timesheetsApi from '@/lib/api/timesheets.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/**
 * Deletes a timesheet entry and invalidates both the cached
 * `['timesheets', 'history']` list and every cached `['timesheets', 'week']`
 * query, since a deleted entry can appear in both the History table and the
 * weekly grid.
 */
export function useDeleteTimesheetEntry() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => timesheetsApi.deleteTimesheetEntry(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timesheets', 'history'] });
      void queryClient.invalidateQueries({ queryKey: ['timesheets', 'week'] });
    },
  });

  return {
    deleteEntry: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not delete this timesheet entry.') : null,
    reset: mutation.reset,
  };
}
