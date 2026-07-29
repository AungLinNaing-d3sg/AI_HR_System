import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useMonthlyCostRevenue } from './useMonthlyCostRevenue';
import type { MonthlyCostRevenueReport } from '@/types/domain.types';

jest.mock('../lib/api/reports.api', () => ({
  getMonthlyCostRevenue: jest.fn(),
}));

const reportsApi = jest.requireMock('../lib/api/reports.api') as { getMonthlyCostRevenue: jest.Mock };

const report: MonthlyCostRevenueReport = {
  year: 2025,
  month: 3,
  currency: { id: 'currency-1', code: 'SGD', symbol: 'S$' },
  projects: [],
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useMonthlyCostRevenue', () => {
  beforeEach(() => {
    reportsApi.getMonthlyCostRevenue.mockReset();
  });

  it('fetches the report once filters are provided', async () => {
    reportsApi.getMonthlyCostRevenue.mockResolvedValue(report);
    const filters = { year: 2025, month: 3 };
    const { result } = renderHook(() => useMonthlyCostRevenue(filters), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.report).toEqual(report);
    expect(reportsApi.getMonthlyCostRevenue).toHaveBeenCalledWith(filters);
  });

  it('does not fetch when filters are null', () => {
    const { result } = renderHook(() => useMonthlyCostRevenue(null), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(reportsApi.getMonthlyCostRevenue).not.toHaveBeenCalled();
  });

  it('surfaces an error message on failure', async () => {
    reportsApi.getMonthlyCostRevenue.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useMonthlyCostRevenue({ year: 2025, month: 3 }), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
