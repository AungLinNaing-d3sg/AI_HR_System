import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useLockTimesheetPeriod } from './useLockTimesheetPeriod';

jest.mock('../lib/api/timesheets.api', () => ({
  lockTimesheetPeriod: jest.fn(),
}));

const timesheetsApi = jest.requireMock('../lib/api/timesheets.api') as { lockTimesheetPeriod: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useLockTimesheetPeriod', () => {
  beforeEach(() => {
    timesheetsApi.lockTimesheetPeriod.mockReset();
  });

  it('locks the period and returns the confirmation', async () => {
    const confirmation = { id: 'period-1', isLocked: true, lockedAt: '2026-06-22T01:26:23.930Z' };
    timesheetsApi.lockTimesheetPeriod.mockResolvedValue(confirmation);
    const { result } = renderHook(() => useLockTimesheetPeriod(), { wrapper });

    let locked: typeof confirmation | undefined;
    await act(async () => {
      locked = await result.current.lockTimesheetPeriod('period-1');
    });

    expect(locked).toEqual(confirmation);
    expect(timesheetsApi.lockTimesheetPeriod).toHaveBeenCalledWith('period-1');
  });

  it('surfaces an error message on failure', async () => {
    timesheetsApi.lockTimesheetPeriod.mockRejectedValue(new Error('not authorized'));
    const { result } = renderHook(() => useLockTimesheetPeriod(), { wrapper });

    await act(async () => {
      try {
        await result.current.lockTimesheetPeriod('period-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
