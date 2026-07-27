jest.mock('./axios', () => ({
  axiosInstance: {
    get: jest.fn(),
  },
}));

const { axiosInstance } = jest.requireMock('./axios') as {
  axiosInstance: { get: jest.Mock };
};

import * as reportsApi from './reports.api';
import type { MonthlyCostRevenueReport, TimesheetReport, UserRolesSummary } from '@/types/domain.types';

const timesheetReport: TimesheetReport = {
  reportGeneratedAt: '2026-06-22T00:00:00.000Z',
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  totalHours: 6,
  totalCount: 1,
  page: 1,
  pageSize: 100,
  items: [],
};

const userRolesSummary: UserRolesSummary = {
  startDate: '2025-01-01',
  endDate: '2025-03-07',
  summary: [],
  grandTotalHours: 0,
};

const costRevenueReport: MonthlyCostRevenueReport = {
  year: 2025,
  month: 3,
  currency: { id: 'currency-1', code: 'SGD', symbol: 'S$' },
  projects: [],
};

describe('reports.api (client)', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    axiosInstance.get.mockReset();
    URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = jest.fn();
  });

  afterAll(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('getTimesheetReport gets /reports/timesheet with the filters and returns the report', async () => {
    axiosInstance.get.mockResolvedValue({ data: { report: timesheetReport } });
    const filters = { startDate: '2025-01-01', endDate: '2025-01-31' };
    const result = await reportsApi.getTimesheetReport(filters);
    expect(axiosInstance.get).toHaveBeenCalledWith('/reports/timesheet', { params: filters });
    expect(result).toEqual(timesheetReport);
  });

  it('getUserRolesSummary gets /reports/roles-summary with the filters and returns the summary', async () => {
    axiosInstance.get.mockResolvedValue({ data: { summary: userRolesSummary } });
    const filters = { startDate: '2025-01-01', endDate: '2025-03-07' };
    const result = await reportsApi.getUserRolesSummary(filters);
    expect(axiosInstance.get).toHaveBeenCalledWith('/reports/roles-summary', { params: filters });
    expect(result).toEqual(userRolesSummary);
  });

  it('getMonthlyCostRevenue gets /reports/cost-revenue with the filters and returns the report', async () => {
    axiosInstance.get.mockResolvedValue({ data: { report: costRevenueReport } });
    const filters = { year: 2025, month: 3 };
    const result = await reportsApi.getMonthlyCostRevenue(filters);
    expect(axiosInstance.get).toHaveBeenCalledWith('/reports/cost-revenue', { params: filters });
    expect(result).toEqual(costRevenueReport);
  });

  it('exportTimesheetReport gets the export endpoint as a blob and triggers a download', async () => {
    const blob = new Blob(['file-bytes']);
    axiosInstance.get.mockResolvedValue({ data: blob });
    const filters = { startDate: '2025-01-01', endDate: '2025-01-31' };

    await reportsApi.exportTimesheetReport(filters, 'csv');

    expect(axiosInstance.get).toHaveBeenCalledWith('/reports/timesheet/export', {
      params: { ...filters, format: 'csv' },
      responseType: 'blob',
    });
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('exportUserRolesSummary gets the export endpoint as a blob and triggers a download', async () => {
    const blob = new Blob(['file-bytes']);
    axiosInstance.get.mockResolvedValue({ data: blob });
    const filters = { startDate: '2025-01-01', endDate: '2025-01-31' };

    await reportsApi.exportUserRolesSummary(filters, 'xlsx');

    expect(axiosInstance.get).toHaveBeenCalledWith('/reports/roles-summary/export', {
      params: { ...filters, format: 'xlsx' },
      responseType: 'blob',
    });
  });

  it('exportMonthlyCostRevenue gets the export endpoint as a blob and triggers a download', async () => {
    const blob = new Blob(['file-bytes']);
    axiosInstance.get.mockResolvedValue({ data: blob });
    const filters = { year: 2025, month: 1 };

    await reportsApi.exportMonthlyCostRevenue(filters, 'csv');

    expect(axiosInstance.get).toHaveBeenCalledWith('/reports/cost-revenue/export', {
      params: { ...filters, format: 'csv' },
      responseType: 'blob',
    });
  });
});
