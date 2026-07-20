import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useCreateTimesheetPeriod } from './useCreateTimesheetPeriod';
import type { TimesheetPeriod } from '@/types/domain.types';

jest.mock('../lib/api/timesheets.api', () => ({
  createTimesheetPeriod: jest.fn(),
}));

const timesheetsApi = jest.requireMock('../lib/api/timesheets.api') as { createTimesheetPeriod: jest.Mock };

const createdPeriod: TimesheetPeriod = {
  id: 'period-1',
  periodStart: '2026-03-01',
  periodEnd: '2026-05-15',
  isLocked: false,
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const values = { periodStart: '2026-03-01', periodEnd: '2026-05-15' };

describe('useCreateTimesheetPeriod', () => {
  beforeEach(() => {
    timesheetsApi.createTimesheetPeriod.mockReset();
  });

  it('reports success after the period is created', async () => {
    timesheetsApi.createTimesheetPeriod.mockResolvedValue(createdPeriod);
    const { result } = renderHook(() => useCreateTimesheetPeriod(), { wrapper });

    await act(async () => {
      await result.current.createTimesheetPeriod(values);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('surfaces an error message on failure', async () => {
    timesheetsApi.createTimesheetPeriod.mockRejectedValue(new Error('overlaps an existing period'));
    const { result } = renderHook(() => useCreateTimesheetPeriod(), { wrapper });

    await act(async () => {
      try {
        await result.current.createTimesheetPeriod(values);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
