import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useTimesheetWeek } from './useTimesheetWeek';
import type { TimesheetWeek } from '@/types/domain.types';

jest.mock('../lib/api/timesheets.api', () => ({
  getTimesheetWeek: jest.fn(),
}));

const timesheetsApi = jest.requireMock('../lib/api/timesheets.api') as { getTimesheetWeek: jest.Mock };

const week: TimesheetWeek = {
  weekStart: '2025-02-24',
  weekEnd: '2025-03-02',
  period: { id: 'period-1', periodStart: '2025-02-01', periodEnd: '2025-02-28', isLocked: false },
  projects: [],
  entries: [],
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useTimesheetWeek', () => {
  beforeEach(() => {
    timesheetsApi.getTimesheetWeek.mockReset();
  });

  it('returns the combined week payload once loaded', async () => {
    timesheetsApi.getTimesheetWeek.mockResolvedValue(week);
    const { result } = renderHook(() => useTimesheetWeek('2025-02-24'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.week).toEqual(week);
    expect(result.current.isError).toBe(false);
    expect(timesheetsApi.getTimesheetWeek).toHaveBeenCalledWith('2025-02-24');
  });

  it('defaults to null before data loads', () => {
    timesheetsApi.getTimesheetWeek.mockResolvedValue(week);
    const { result } = renderHook(() => useTimesheetWeek('2025-02-24'), { wrapper });
    expect(result.current.week).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    timesheetsApi.getTimesheetWeek.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useTimesheetWeek('2025-02-24'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });

  it('does not fetch when weekStart is empty', () => {
    renderHook(() => useTimesheetWeek(''), { wrapper });
    expect(timesheetsApi.getTimesheetWeek).not.toHaveBeenCalled();
  });
});
