import 'server-only';

import { backendClient } from '@/lib/api/backendClient';
import type {
  ApproveTimesheetEntryResponseDto,
  CreateTimesheetEntryRequest,
  CreateTimesheetPeriodRequest,
  LockTimesheetPeriodResponseDto,
  TimesheetEntryListResponse,
  TimesheetEntryResponse,
  TimesheetPeriodListResponse,
  TimesheetPeriodResponse,
  UpdateTimesheetEntryRequest,
} from '@/types/api.types';

/**
 * Server-only Timesheet domain module. Every function here calls the real
 * .NET `/api/v1/TimesheetPeriod/*` and `/api/v1/TimesheetEntry/*` endpoints
 * (see docs/HR_System_BE.postman_collection.json) through `backendClient`.
 * Only Route Handlers under `app/api/timesheets/**` may import this file -
 * it is never bundled for the browser.
 */

function authHeader(accessToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${accessToken}` };
}

export interface TimesheetPeriodQuery {
  isLocked?: boolean;
  year?: number;
  month?: number;
}

export async function getTimesheetPeriods(
  accessToken: string,
  query: TimesheetPeriodQuery = {}
): Promise<TimesheetPeriodListResponse> {
  const response = await backendClient.get<TimesheetPeriodListResponse>(
    '/TimesheetPeriod/GetAllTimesheetPeriods',
    { headers: authHeader(accessToken), params: query }
  );
  return response.data;
}

export async function createTimesheetPeriod(
  payload: CreateTimesheetPeriodRequest,
  accessToken: string
): Promise<TimesheetPeriodResponse> {
  const response = await backendClient.post<TimesheetPeriodResponse>(
    '/TimesheetPeriod/CreateTimesheetPeriod',
    payload,
    { headers: authHeader(accessToken) }
  );
  return response.data;
}

/** `DeleteTimesheetPeriod` returns `Data: null` on success - nothing to read off the response. */
export async function deleteTimesheetPeriod(id: string, accessToken: string): Promise<void> {
  await backendClient.delete(`/TimesheetPeriod/DeleteTimesheetPeriod/${id}`, {
    headers: authHeader(accessToken),
  });
}

/** `LockTimesheetPeriod` returns only a partial confirmation - see `LockTimesheetPeriodResponseDto`. */
export async function lockTimesheetPeriod(
  id: string,
  accessToken: string
): Promise<LockTimesheetPeriodResponseDto> {
  const response = await backendClient.put<LockTimesheetPeriodResponseDto>(
    `/TimesheetPeriod/LockTimesheetPeriod/${id}`,
    undefined,
    { headers: authHeader(accessToken) }
  );
  return response.data;
}

/** `UnlockTimesheetPeriod` returns `Data: null` on success - nothing to read off the response. */
export async function unlockTimesheetPeriod(id: string, accessToken: string): Promise<void> {
  await backendClient.put(`/TimesheetPeriod/UnlockTimesheetPeriod/${id}`, undefined, {
    headers: authHeader(accessToken),
  });
}

export interface TimesheetEntryQuery {
  userId?: string;
  projectId?: string;
  timesheetPeriodId?: string;
  isApproved?: boolean;
}

export async function getTimesheetEntries(
  accessToken: string,
  query: TimesheetEntryQuery = {}
): Promise<TimesheetEntryListResponse> {
  const response = await backendClient.get<TimesheetEntryListResponse>(
    '/TimesheetEntry/GetAllTimesheetEntries',
    { headers: authHeader(accessToken), params: query }
  );
  return response.data;
}

export async function createTimesheetEntry(
  payload: CreateTimesheetEntryRequest,
  accessToken: string
): Promise<TimesheetEntryResponse> {
  const response = await backendClient.post<TimesheetEntryResponse>(
    '/TimesheetEntry/CreateTimesheetEntry',
    payload,
    { headers: authHeader(accessToken) }
  );
  return response.data;
}

/** `UpdateTimesheetEntry` returns `Data: null` on success - see `UpdateTimesheetEntryResponse` in api.types.ts. */
export async function updateTimesheetEntry(
  id: string,
  payload: UpdateTimesheetEntryRequest,
  accessToken: string
): Promise<void> {
  await backendClient.put(`/TimesheetEntry/UpdateTimesheetEntry/${id}`, payload, {
    headers: authHeader(accessToken),
  });
}

/** `ApproveTimesheetEntry` returns only a partial confirmation - see `ApproveTimesheetEntryResponseDto`. */
export async function approveTimesheetEntry(
  id: string,
  accessToken: string
): Promise<ApproveTimesheetEntryResponseDto> {
  const response = await backendClient.put<ApproveTimesheetEntryResponseDto>(
    `/TimesheetEntry/ApproveTimesheetEntry/${id}`,
    undefined,
    { headers: authHeader(accessToken) }
  );
  return response.data;
}
