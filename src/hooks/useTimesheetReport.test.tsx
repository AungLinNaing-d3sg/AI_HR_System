import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useTimesheetReport } from './useTimesheetReport';
import type { TimesheetReport } from '@/types/domain.types';

jest.mock('../lib/api/reports.api', () => ({
  getTimesheetReport: jest.fn(),
}));

const reportsApi = jest.requireMock('../lib/api/reports.api') as { getTimesheetReport: jest.Mock };

const report: TimesheetReport = {
  reportGeneratedAt: '2026-06-22T00:00:00.000Z',
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  totalHours: 6,
  totalCount: 1,
  page: 1,
  pageSize: 500,
  items: [],
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useTimesheetReport', () => {
  beforeEach(() => {
    reportsApi.getTimesheetReport.mockReset();
  });

  it('fetches the report once filters are provided', async () => {
    reportsApi.getTimesheetReport.mockResolvedValue(report);
    const filters = { startDate: '2025-01-01', endDate: '2025-01-31' };
    const { result } = renderHook(() => useTimesheetReport(filters), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.report).toEqual(report);
    expect(reportsApi.getTimesheetReport).toHaveBeenCalledWith(filters);
  });

  it('does not fetch when filters are null', () => {
    const { result } = renderHook(() => useTimesheetReport(null), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(reportsApi.getTimesheetReport).not.toHaveBeenCalled();
  });

  it('surfaces an error message on failure', async () => {
    reportsApi.getTimesheetReport.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(
      () => useTimesheetReport({ startDate: '2025-01-01', endDate: '2025-01-31' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
