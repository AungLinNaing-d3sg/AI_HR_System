import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useExportMonthlyCostRevenue } from './useExportMonthlyCostRevenue';

jest.mock('../lib/api/reports.api', () => ({
  exportMonthlyCostRevenue: jest.fn(),
}));

const reportsApi = jest.requireMock('../lib/api/reports.api') as { exportMonthlyCostRevenue: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useExportMonthlyCostRevenue', () => {
  beforeEach(() => {
    reportsApi.exportMonthlyCostRevenue.mockReset();
  });

  it('calls exportMonthlyCostRevenue with the given filters/format', async () => {
    reportsApi.exportMonthlyCostRevenue.mockResolvedValue(undefined);
    const { result } = renderHook(() => useExportMonthlyCostRevenue(), { wrapper });

    const filters = { year: 2025, month: 1 };
    await result.current.exportReport(filters, 'xlsx');

    expect(reportsApi.exportMonthlyCostRevenue).toHaveBeenCalledWith(filters, 'xlsx');
  });

  it('surfaces an error message on failure', async () => {
    reportsApi.exportMonthlyCostRevenue.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useExportMonthlyCostRevenue(), { wrapper });

    await expect(result.current.exportReport({ year: 2025, month: 1 }, 'csv')).rejects.toThrow();

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
