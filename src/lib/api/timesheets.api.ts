import { axiosInstance } from '@/lib/api/axios';
import type {
  ApproveTimesheetEntryResponsePayload,
  TimesheetEntryResponsePayload,
  TimesheetEntryUpdateResponsePayload,
  TimesheetHistoryResponsePayload,
  TimesheetPeriodListResponsePayload,
  TimesheetPeriodLockResponsePayload,
  TimesheetPeriodResponsePayload,
  TimesheetPeriodUnlockResponsePayload,
  TimesheetWeekResponsePayload,
} from '@/types/api.types';
import type { TimesheetEntry, TimesheetHistoryEntry, TimesheetPeriod } from '@/types/domain.types';
import type {
  CreateTimesheetEntryFormValues,
  CreateTimesheetPeriodFormValues,
  UpdateTimesheetEntryFormValues,
} from '@/lib/validators/timesheet.validators';

/**
 * Client-side Timesheet domain module. Hooks (`useTimesheetWeek`,
 * `useCreateTimesheetEntry`, `useUpdateTimesheetEntry`, `useTimesheetHistory`,
 * `useApproveTimesheetEntry`) call these functions instead of touching Axios
 * directly; every call here is same-origin, against this app's own
 * `/api/timesheets/*` Route Handlers.
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

/** Returns only `{ id, hours, taskDescription }` - see `TimesheetEntryUpdateResponsePayload`. */
export async function updateTimesheetEntry(
  id: string,
  values: UpdateTimesheetEntryFormValues
): Promise<TimesheetEntryUpdateResponsePayload['entry']> {
  const { data } = await axiosInstance.put<TimesheetEntryUpdateResponsePayload>(`/timesheets/entries/${id}`, values);
  return data.entry;
}

export async function getTimesheetHistory(): Promise<TimesheetHistoryEntry[]> {
  const { data } = await axiosInstance.get<TimesheetHistoryResponsePayload>('/timesheets/history');
  return data.entries;
}

export async function approveTimesheetEntry(id: string): Promise<ApproveTimesheetEntryResponsePayload> {
  const { data } = await axiosInstance.put<ApproveTimesheetEntryResponsePayload>(
    `/timesheets/entries/${id}/approve`
  );
  return data;
}

export async function getTimesheetPeriods(): Promise<TimesheetPeriod[]> {
  const { data } = await axiosInstance.get<TimesheetPeriodListResponsePayload>('/timesheets/periods');
  return data.periods;
}

export async function createTimesheetPeriod(values: CreateTimesheetPeriodFormValues): Promise<TimesheetPeriod> {
  const { data } = await axiosInstance.post<TimesheetPeriodResponsePayload>('/timesheets/periods', values);
  return data.period;
}

export async function deleteTimesheetPeriod(id: string): Promise<void> {
  await axiosInstance.delete(`/timesheets/periods/${id}`);
}

export async function lockTimesheetPeriod(id: string): Promise<TimesheetPeriodLockResponsePayload> {
  const { data } = await axiosInstance.put<TimesheetPeriodLockResponsePayload>(`/timesheets/periods/${id}/lock`);
  return data;
}

export async function unlockTimesheetPeriod(id: string): Promise<TimesheetPeriodUnlockResponsePayload> {
  const { data } = await axiosInstance.put<TimesheetPeriodUnlockResponsePayload>(
    `/timesheets/periods/${id}/unlock`
  );
  return data;
}
