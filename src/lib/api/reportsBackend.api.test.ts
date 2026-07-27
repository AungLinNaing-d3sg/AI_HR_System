/**
 * @jest-environment node
 */
jest.mock('./backendClient', () => ({
  backendClient: {
    get: jest.fn(),
  },
}));

const { backendClient } = jest.requireMock('./backendClient') as {
  backendClient: { get: jest.Mock };
};

import * as reportsBackend from './reportsBackend.api';

describe('reportsBackend.api (server)', () => {
  beforeEach(() => {
    backendClient.get.mockReset();
  });

  it('getTimesheetReport gets /Report/GenerateTimesheetReport with a Bearer header and the query params', async () => {
    const dto = { ReportGeneratedAt: '2026-06-22T00:00:00.000Z', StartDate: '2025-01-01', EndDate: '2025-01-31', TotalHours: 0, TotalCount: 0, Page: 1, PageSize: 100, Items: [] };
    backendClient.get.mockResolvedValue({ data: dto });
    const query = { startDate: '2025-01-01', endDate: '2025-01-31', pageSize: 500 };
    const result = await reportsBackend.getTimesheetReport(query, 'access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Report/GenerateTimesheetReport', {
      headers: { Authorization: 'Bearer access-token' },
      params: query,
    });
    expect(result).toEqual(dto);
  });

  it('exportTimesheetReport gets /Report/ExportTimesheetReport with responseType arraybuffer and returns the content type', async () => {
    const buffer = new TextEncoder().encode('file-bytes').buffer as ArrayBuffer;
    backendClient.get.mockResolvedValue({ data: buffer, headers: { 'content-type': 'text/csv' } });
    const query = { startDate: '2025-01-01', endDate: '2025-01-31', format: 'csv' as const };
    const result = await reportsBackend.exportTimesheetReport(query, 'access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Report/ExportTimesheetReport', {
      headers: { Authorization: 'Bearer access-token' },
      params: query,
      responseType: 'arraybuffer',
    });
    expect(result).toEqual({ data: buffer, contentType: 'text/csv' });
  });

  it('exportTimesheetReport falls back to application/octet-stream when no content-type header is present', async () => {
    const buffer = new TextEncoder().encode('file-bytes').buffer as ArrayBuffer;
    backendClient.get.mockResolvedValue({ data: buffer, headers: {} });
    const result = await reportsBackend.exportTimesheetReport(
      { startDate: '2025-01-01', endDate: '2025-01-31', format: 'xlsx' },
      'access-token'
    );
    expect(result.contentType).toBe('application/octet-stream');
  });

  it('getUserRolesSummary gets /Report/GenerateUserRolesSummary with a Bearer header and the query params', async () => {
    const dto = { StartDate: '2025-01-01', EndDate: '2025-03-07', Summary: [], GrandTotalHours: 0 };
    backendClient.get.mockResolvedValue({ data: dto });
    const query = { startDate: '2025-01-01', endDate: '2025-03-07' };
    const result = await reportsBackend.getUserRolesSummary(query, 'access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Report/GenerateUserRolesSummary', {
      headers: { Authorization: 'Bearer access-token' },
      params: query,
    });
    expect(result).toEqual(dto);
  });

  it('exportUserRolesSummary gets /Report/ExportUserRolesSummary with responseType arraybuffer', async () => {
    const buffer = new TextEncoder().encode('file-bytes').buffer as ArrayBuffer;
    backendClient.get.mockResolvedValue({ data: buffer, headers: { 'content-type': 'application/vnd.ms-excel' } });
    const query = { startDate: '2025-01-01', endDate: '2025-01-31', format: 'xlsx' as const };
    await reportsBackend.exportUserRolesSummary(query, 'access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Report/ExportUserRolesSummary', {
      headers: { Authorization: 'Bearer access-token' },
      params: query,
      responseType: 'arraybuffer',
    });
  });

  it('getMonthlyCostRevenue gets /Report/GenerateMonthlyCostRevenue with a Bearer header and the query params', async () => {
    const dto = { Year: 2025, Month: 3, Currency: { Id: 'c1', Code: 'SGD', Symbol: 'S$' }, Projects: [] };
    backendClient.get.mockResolvedValue({ data: dto });
    const query = { year: 2025, month: 3 };
    const result = await reportsBackend.getMonthlyCostRevenue(query, 'access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Report/GenerateMonthlyCostRevenue', {
      headers: { Authorization: 'Bearer access-token' },
      params: query,
    });
    expect(result).toEqual(dto);
  });

  it('exportMonthlyCostRevenue gets /Report/ExportMonthlyCostRevenue with responseType arraybuffer', async () => {
    const buffer = new TextEncoder().encode('file-bytes').buffer as ArrayBuffer;
    backendClient.get.mockResolvedValue({ data: buffer, headers: { 'content-type': 'text/csv' } });
    const query = { year: 2025, month: 1, format: 'csv' as const };
    await reportsBackend.exportMonthlyCostRevenue(query, 'access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Report/ExportMonthlyCostRevenue', {
      headers: { Authorization: 'Bearer access-token' },
      params: query,
      responseType: 'arraybuffer',
    });
  });
});
