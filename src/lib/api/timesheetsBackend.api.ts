import 'server-only';

import { backendClient } from '@/lib/api/backendClient';
import type {
  CreateTimesheetEntryRequest,
  TimesheetEntryListResponse,
  TimesheetEntryResponse,
  TimesheetPeriodListResponse,
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

export async function updateTimesheetEntry(
  id: string,
  payload: UpdateTimesheetEntryRequest,
  accessToken: string
): Promise<TimesheetEntryResponse> {
  const response = await backendClient.put<TimesheetEntryResponse>(
    `/TimesheetEntry/UpdateTimesheetEntry/${id}`,
    payload,
    { headers: authHeader(accessToken) }
  );
  return response.data;
}
