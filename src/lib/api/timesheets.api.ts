import { axiosInstance } from '@/lib/api/axios';
import type { TimesheetEntryResponsePayload, TimesheetWeekResponsePayload } from '@/types/api.types';
import type { TimesheetEntry } from '@/types/domain.types';
import type {
  CreateTimesheetEntryFormValues,
  UpdateTimesheetEntryFormValues,
} from '@/lib/validators/timesheet.validators';

/**
 * Client-side Timesheet domain module. Hooks (`useTimesheetWeek`,
 * `useCreateTimesheetEntry`, `useUpdateTimesheetEntry`) call these functions
 * instead of touching Axios directly; every call here is same-origin,
 * against this app's own `/api/timesheets/*` Route Handlers.
 */

export async function getTimesheetWeek(weekStart: string): Promise<TimesheetWeekResponsePayload> {
  const { data } = await axiosInstance.get<TimesheetWeekResponsePayload>('/timesheets/week', {
    params: { weekStart },
  });
  return data;
}

export async function createTimesheetEntry(values: CreateTimesheetEntryFormValues): Promise<TimesheetEntry> {
  const { data } = await axiosInstance.post<TimesheetEntryResponsePayload>('/timesheets/entries', values);
  return data.entry;
}

export async function updateTimesheetEntry(
  id: string,
  values: UpdateTimesheetEntryFormValues
): Promise<TimesheetEntry> {
  const { data } = await axiosInstance.put<TimesheetEntryResponsePayload>(`/timesheets/entries/${id}`, values);
  return data.entry;
}
