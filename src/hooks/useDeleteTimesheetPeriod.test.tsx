import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useDeleteTimesheetPeriod } from './useDeleteTimesheetPeriod';

jest.mock('../lib/api/timesheets.api', () => ({
  deleteTimesheetPeriod: jest.fn(),
}));

const timesheetsApi = jest.requireMock('../lib/api/timesheets.api') as { deleteTimesheetPeriod: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useDeleteTimesheetPeriod', () => {
  beforeEach(() => {
    timesheetsApi.deleteTimesheetPeriod.mockReset();
  });

  it('calls deleteTimesheetPeriod with the given id', async () => {
    timesheetsApi.deleteTimesheetPeriod.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteTimesheetPeriod(), { wrapper });

    await act(async () => {
      await result.current.deleteTimesheetPeriod('period-1');
    });

    expect(timesheetsApi.deleteTimesheetPeriod).toHaveBeenCalledWith('period-1');
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    timesheetsApi.deleteTimesheetPeriod.mockRejectedValue(new Error('has entries'));
    const { result } = renderHook(() => useDeleteTimesheetPeriod(), { wrapper });

    await act(async () => {
      try {
        await result.current.deleteTimesheetPeriod('period-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
