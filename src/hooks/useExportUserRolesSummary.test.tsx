import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useExportUserRolesSummary } from './useExportUserRolesSummary';

jest.mock('../lib/api/reports.api', () => ({
  exportUserRolesSummary: jest.fn(),
}));

const reportsApi = jest.requireMock('../lib/api/reports.api') as { exportUserRolesSummary: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useExportUserRolesSummary', () => {
  beforeEach(() => {
    reportsApi.exportUserRolesSummary.mockReset();
  });

  it('calls exportUserRolesSummary with the given filters/format', async () => {
    reportsApi.exportUserRolesSummary.mockResolvedValue(undefined);
    const { result } = renderHook(() => useExportUserRolesSummary(), { wrapper });

    const filters = { startDate: '2025-01-01', endDate: '2025-03-07' };
    await result.current.exportReport(filters, 'xlsx');

    expect(reportsApi.exportUserRolesSummary).toHaveBeenCalledWith(filters, 'xlsx');
  });

  it('surfaces an error message on failure', async () => {
    reportsApi.exportUserRolesSummary.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useExportUserRolesSummary(), { wrapper });

    await expect(
      result.current.exportReport({ startDate: '2025-01-01', endDate: '2025-03-07' }, 'csv')
    ).rejects.toThrow();

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
