import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useDeleteTimesheetEntry } from './useDeleteTimesheetEntry';

jest.mock('../lib/api/timesheets.api', () => ({
  deleteTimesheetEntry: jest.fn(),
}));

const timesheetsApi = jest.requireMock('../lib/api/timesheets.api') as { deleteTimesheetEntry: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useDeleteTimesheetEntry', () => {
  beforeEach(() => {
    timesheetsApi.deleteTimesheetEntry.mockReset();
  });

  it('calls deleteTimesheetEntry with the given id', async () => {
    timesheetsApi.deleteTimesheetEntry.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteTimesheetEntry(), { wrapper });

    await act(async () => {
      await result.current.deleteEntry('entry-1');
    });

    expect(timesheetsApi.deleteTimesheetEntry).toHaveBeenCalledWith('entry-1');
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    timesheetsApi.deleteTimesheetEntry.mockRejectedValue(new Error('cannot delete approved entry'));
    const { result } = renderHook(() => useDeleteTimesheetEntry(), { wrapper });

    await act(async () => {
      try {
        await result.current.deleteEntry('entry-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
