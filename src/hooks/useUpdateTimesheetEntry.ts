'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as timesheetsApi from '@/lib/api/timesheets.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { UpdateTimesheetEntryFormValues } from '@/lib/validators/timesheet.validators';

export interface UpdateTimesheetEntryInput {
  id: string;
  values: UpdateTimesheetEntryFormValues;
}

/** Updates an existing timesheet entry's hours/notes and invalidates every cached `['timesheets', 'week']` query. */
export function useUpdateTimesheetEntry() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, values }: UpdateTimesheetEntryInput) => timesheetsApi.updateTimesheetEntry(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timesheets', 'week'] });
    },
  });

  return {
    updateEntry: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not update this timesheet entry.') : null,
    reset: mutation.reset,
  };
}
