import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useTimesheetPeriods } from './useTimesheetPeriods';
import type { TimesheetPeriod } from '@/types/domain.types';

jest.mock('../lib/api/timesheets.api', () => ({
  getTimesheetPeriods: jest.fn(),
}));

const timesheetsApi = jest.requireMock('../lib/api/timesheets.api') as { getTimesheetPeriods: jest.Mock };

const periods: TimesheetPeriod[] = [
  { id: 'period-1', periodStart: '2026-03-01', periodEnd: '2026-05-15', isLocked: false },
];

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useTimesheetPeriods', () => {
  beforeEach(() => {
    timesheetsApi.getTimesheetPeriods.mockReset();
  });

  it('returns the loaded periods', async () => {
    timesheetsApi.getTimesheetPeriods.mockResolvedValue(periods);
    const { result } = renderHook(() => useTimesheetPeriods(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.periods).toEqual(periods);
  });

  it('surfaces an error message on failure', async () => {
    timesheetsApi.getTimesheetPeriods.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useTimesheetPeriods(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
