import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useExportTimesheetReport } from './useExportTimesheetReport';

jest.mock('../lib/api/reports.api', () => ({
  exportTimesheetReport: jest.fn(),
}));

const reportsApi = jest.requireMock('../lib/api/reports.api') as { exportTimesheetReport: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useExportTimesheetReport', () => {
  beforeEach(() => {
    reportsApi.exportTimesheetReport.mockReset();
  });

  it('calls exportTimesheetReport with the given filters/format', async () => {
    reportsApi.exportTimesheetReport.mockResolvedValue(undefined);
    const { result } = renderHook(() => useExportTimesheetReport(), { wrapper });

    const filters = { startDate: '2025-01-01', endDate: '2025-01-31' };
    await result.current.exportReport(filters, 'csv');

    expect(reportsApi.exportTimesheetReport).toHaveBeenCalledWith(filters, 'csv');
  });

  it('surfaces an error message on failure', async () => {
    reportsApi.exportTimesheetReport.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useExportTimesheetReport(), { wrapper });

    await expect(
      result.current.exportReport({ startDate: '2025-01-01', endDate: '2025-01-31' }, 'xlsx')
    ).rejects.toThrow();

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
