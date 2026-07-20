import { axiosInstance } from '@/lib/api/axios';
import type { ReportExportFormat } from '@/lib/constants/report.constants';
import type {
  MonthlyCostRevenueResponsePayload,
  TimesheetReportResponsePayload,
  UserRolesSummaryResponsePayload,
} from '@/types/api.types';
import type { MonthlyCostRevenueReport, TimesheetReport, UserRolesSummary } from '@/types/domain.types';

/**
 * Client-side Report domain module. Hooks (`useTimesheetReport`,
 * `useUserRolesSummary`, `useMonthlyCostRevenue`, and the `useExport*`
 * mutation hooks) call these functions instead of touching Axios directly;
 * every call here is same-origin, against this app's own `/api/reports/*`
 * Route Handlers.
 */

export interface TimesheetReportFilters {
  startDate: string;
  endDate: string;
  projectId?: string;
  userId?: string;
}

export async function getTimesheetReport(filters: TimesheetReportFilters): Promise<TimesheetReport> {
  const { data } = await axiosInstance.get<TimesheetReportResponsePayload>('/reports/timesheet', {
    params: filters,
  });
  return data.report;
}

export interface UserRolesSummaryFilters {
  startDate: string;
  endDate: string;
  projectId?: string;
}

export async function getUserRolesSummary(filters: UserRolesSummaryFilters): Promise<UserRolesSummary> {
  const { data } = await axiosInstance.get<UserRolesSummaryResponsePayload>('/reports/roles-summary', {
    params: filters,
  });
  return data.summary;
}

export interface MonthlyCostRevenueFilters {
  year: number;
  month: number;
  projectId?: string;
  currencyId?: string;
}

export async function getMonthlyCostRevenue(filters: MonthlyCostRevenueFilters): Promise<MonthlyCostRevenueReport> {
  const { data } = await axiosInstance.get<MonthlyCostRevenueResponsePayload>('/reports/cost-revenue', {
    params: filters,
  });
  return data.report;
}

/**
 * Triggers a browser file download for an already-fetched export `Blob`,
 * using a throwaway anchor element - the standard, dependency-free way to
 * turn an in-memory response into a "Save As" download without navigating
 * away from the current page.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function exportTimesheetReport(
  filters: TimesheetReportFilters,
  format: ReportExportFormat
): Promise<void> {
  const { data } = await axiosInstance.get<Blob>('/reports/timesheet/export', {
    params: { ...filters, format },
    responseType: 'blob',
  });
  triggerDownload(data, `timesheet-report-${filters.startDate}-to-${filters.endDate}.${format}`);
}

export async function exportUserRolesSummary(
  filters: UserRolesSummaryFilters,
  format: ReportExportFormat
): Promise<void> {
  const { data } = await axiosInstance.get<Blob>('/reports/roles-summary/export', {
    params: { ...filters, format },
    responseType: 'blob',
  });
  triggerDownload(data, `user-roles-summary-${filters.startDate}-to-${filters.endDate}.${format}`);
}

export async function exportMonthlyCostRevenue(
  filters: MonthlyCostRevenueFilters,
  format: ReportExportFormat
): Promise<void> {
  const { data } = await axiosInstance.get<Blob>('/reports/cost-revenue/export', {
    params: { ...filters, format },
    responseType: 'blob',
  });
  triggerDownload(data, `cost-revenue-report-${filters.year}-${String(filters.month).padStart(2, '0')}.${format}`);
}
