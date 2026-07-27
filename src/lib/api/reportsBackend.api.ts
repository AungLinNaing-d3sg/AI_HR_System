import 'server-only';

import { backendClient } from '@/lib/api/backendClient';
import type { ReportExportFormat } from '@/lib/constants/report.constants';
import type {
  MonthlyCostRevenueResponseDto,
  TimesheetReportResponseDto,
  UserRolesSummaryResponseDto,
} from '@/types/api.types';

/**
 * Server-only Report domain module. Every function here calls the real
 * .NET `/api/v1/Report/*` endpoints (see
 * docs/HR_System_BE.postman_collection.json) through `backendClient`. Only
 * Route Handlers under `app/api/reports/**` may import this file - it is
 * never bundled for the browser.
 */

function authHeader(accessToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${accessToken}` };
}

/** A raw exported report file, streamed back to the browser as-is by the Report domain's "export" Route Handlers. */
export interface ExportedReportFile {
  data: ArrayBuffer;
  contentType: string;
}

async function exportFile(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
  accessToken: string
): Promise<ExportedReportFile> {
  const response = await backendClient.get<ArrayBuffer>(path, {
    headers: authHeader(accessToken),
    params,
    responseType: 'arraybuffer',
  });
  const contentType =
    (response.headers as Record<string, string> | undefined)?.['content-type'] ?? 'application/octet-stream';
  return { data: response.data, contentType };
}

export interface TimesheetReportQuery {
  startDate: string;
  endDate: string;
  projectId?: string;
  userId?: string;
  isApproved?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getTimesheetReport(
  query: TimesheetReportQuery,
  accessToken: string
): Promise<TimesheetReportResponseDto> {
  const response = await backendClient.get<TimesheetReportResponseDto>('/Report/GenerateTimesheetReport', {
    headers: authHeader(accessToken),
    params: query,
  });
  return response.data;
}

export interface TimesheetReportExportQuery extends TimesheetReportQuery {
  format: ReportExportFormat;
}

export async function exportTimesheetReport(
  query: TimesheetReportExportQuery,
  accessToken: string
): Promise<ExportedReportFile> {
  return exportFile('/Report/ExportTimesheetReport', { ...query }, accessToken);
}

export interface UserRolesSummaryQuery {
  startDate: string;
  endDate: string;
  projectId?: string;
}

export async function getUserRolesSummary(
  query: UserRolesSummaryQuery,
  accessToken: string
): Promise<UserRolesSummaryResponseDto> {
  const response = await backendClient.get<UserRolesSummaryResponseDto>('/Report/GenerateUserRolesSummary', {
    headers: authHeader(accessToken),
    params: query,
  });
  return response.data;
}

export interface UserRolesSummaryExportQuery extends UserRolesSummaryQuery {
  format: ReportExportFormat;
}

export async function exportUserRolesSummary(
  query: UserRolesSummaryExportQuery,
  accessToken: string
): Promise<ExportedReportFile> {
  return exportFile('/Report/ExportUserRolesSummary', { ...query }, accessToken);
}

export interface MonthlyCostRevenueQuery {
  year: number;
  month: number;
  projectId?: string;
  currencyId?: string;
}

export async function getMonthlyCostRevenue(
  query: MonthlyCostRevenueQuery,
  accessToken: string
): Promise<MonthlyCostRevenueResponseDto> {
  const response = await backendClient.get<MonthlyCostRevenueResponseDto>('/Report/GenerateMonthlyCostRevenue', {
    headers: authHeader(accessToken),
    params: query,
  });
  return response.data;
}

export interface MonthlyCostRevenueExportQuery extends MonthlyCostRevenueQuery {
  format: ReportExportFormat;
}

export async function exportMonthlyCostRevenue(
  query: MonthlyCostRevenueExportQuery,
  accessToken: string
): Promise<ExportedReportFile> {
  return exportFile('/Report/ExportMonthlyCostRevenue', { ...query }, accessToken);
}
