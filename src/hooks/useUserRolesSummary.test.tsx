import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useUserRolesSummary } from './useUserRolesSummary';
import type { UserRolesSummary } from '@/types/domain.types';

jest.mock('../lib/api/reports.api', () => ({
  getUserRolesSummary: jest.fn(),
}));

const reportsApi = jest.requireMock('../lib/api/reports.api') as { getUserRolesSummary: jest.Mock };

const summary: UserRolesSummary = {
  startDate: '2025-01-01',
  endDate: '2025-03-07',
  summary: [],
  grandTotalHours: 0,
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useUserRolesSummary', () => {
  beforeEach(() => {
    reportsApi.getUserRolesSummary.mockReset();
  });

  it('fetches the summary once filters are provided', async () => {
    reportsApi.getUserRolesSummary.mockResolvedValue(summary);
    const filters = { startDate: '2025-01-01', endDate: '2025-03-07' };
    const { result } = renderHook(() => useUserRolesSummary(filters), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.summary).toEqual(summary);
    expect(reportsApi.getUserRolesSummary).toHaveBeenCalledWith(filters);
  });

  it('does not fetch when filters are null', () => {
    const { result } = renderHook(() => useUserRolesSummary(null), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(reportsApi.getUserRolesSummary).not.toHaveBeenCalled();
  });

  it('surfaces an error message on failure', async () => {
    reportsApi.getUserRolesSummary.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(
      () => useUserRolesSummary({ startDate: '2025-01-01', endDate: '2025-03-07' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
