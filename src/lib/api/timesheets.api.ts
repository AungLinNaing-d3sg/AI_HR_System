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

/**
 * `periodId` (the "Timesheet Period" dropdown's selection - see
 * `useTimesheetGrid#goToPeriod`) pins the response to that specific period
 * instead of leaving `/api/timesheets/week` to re-derive "the" period purely
 * from the resolved week's date range, which is ambiguous whenever two
 * periods overlap the same week (see that route's doc comment).
 */
export async function getTimesheetWeek(weekStart: string, periodId?: string): Promise<TimesheetWeekResponsePayload> {
  const { data } = await axiosInstance.get<TimesheetWeekResponsePayload>('/timesheets/week', {
    params: periodId ? { weekStart, periodId } : { weekStart },
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

export interface TimesheetHistoryParams {
  pageNo?: number;
  pageSize?: number;
}

export interface TimesheetHistoryResult {
  entries: TimesheetHistoryEntry[];
  totalCount: number;
  pageNo: number;
  pageSize: number;
}

/**
 * Fetches a page of the `/timesheets/history` table's entries.
 * `pageNo`/`pageSize` drive the shared `Pagination` control
 * (`components/common/Pagination.tsx`) - see `useTimesheetHistory`.
 */
export async function getTimesheetHistory(params: TimesheetHistoryParams = {}): Promise<TimesheetHistoryResult> {
  const { data } = await axiosInstance.get<TimesheetHistoryResponsePayload>('/timesheets/history', { params });
  return { entries: data.entries, totalCount: data.totalCount, pageNo: data.pageNo, pageSize: data.pageSize };
}

export async function approveTimesheetEntry(id: string): Promise<ApproveTimesheetEntryResponsePayload> {
  const { data } = await axiosInstance.put<ApproveTimesheetEntryResponsePayload>(
    `/timesheets/entries/${id}/approve`
  );
  return data;
}

export async function deleteTimesheetEntry(id: string): Promise<void> {
  await axiosInstance.delete(`/timesheets/entries/${id}`);
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
