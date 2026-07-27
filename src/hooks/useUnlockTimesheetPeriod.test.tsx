import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useUnlockTimesheetPeriod } from './useUnlockTimesheetPeriod';

jest.mock('../lib/api/timesheets.api', () => ({
  unlockTimesheetPeriod: jest.fn(),
}));

const timesheetsApi = jest.requireMock('../lib/api/timesheets.api') as { unlockTimesheetPeriod: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useUnlockTimesheetPeriod', () => {
  beforeEach(() => {
    timesheetsApi.unlockTimesheetPeriod.mockReset();
  });

  it('unlocks the period and returns the confirmation', async () => {
    const confirmation = { id: 'period-1', isLocked: false };
    timesheetsApi.unlockTimesheetPeriod.mockResolvedValue(confirmation);
    const { result } = renderHook(() => useUnlockTimesheetPeriod(), { wrapper });

    let unlocked: typeof confirmation | undefined;
    await act(async () => {
      unlocked = await result.current.unlockTimesheetPeriod('period-1');
    });

    expect(unlocked).toEqual(confirmation);
    expect(timesheetsApi.unlockTimesheetPeriod).toHaveBeenCalledWith('period-1');
  });

  it('surfaces an error message on failure', async () => {
    timesheetsApi.unlockTimesheetPeriod.mockRejectedValue(new Error('not authorized'));
    const { result } = renderHook(() => useUnlockTimesheetPeriod(), { wrapper });

    await act(async () => {
      try {
        await result.current.unlockTimesheetPeriod('period-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
