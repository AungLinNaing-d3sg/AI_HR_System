'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as timesheetsApi from '@/lib/api/timesheets.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { CreateTimesheetEntryFormValues } from '@/lib/validators/timesheet.validators';

/**
 * Creates a new timesheet entry and invalidates every cached
 * `['timesheets', 'week']` query so the grid refetches, plus the
 * `['timesheets', 'history']` list, since a newly-logged entry also appears
 * there.
 */
export function useCreateTimesheetEntry() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: CreateTimesheetEntryFormValues) => timesheetsApi.createTimesheetEntry(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timesheets', 'week'] });
      void queryClient.invalidateQueries({ queryKey: ['timesheets', 'history'] });
    },
  });

  return {
    createEntry: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not save this timesheet entry.') : null,
    reset: mutation.reset,
  };
}
