import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useApproveTimesheetEntry } from './useApproveTimesheetEntry';

jest.mock('../lib/api/timesheets.api', () => ({
  approveTimesheetEntry: jest.fn(),
}));

const timesheetsApi = jest.requireMock('../lib/api/timesheets.api') as { approveTimesheetEntry: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useApproveTimesheetEntry', () => {
  beforeEach(() => {
    timesheetsApi.approveTimesheetEntry.mockReset();
  });

  it('approves the entry and returns the confirmation', async () => {
    const confirmation = { id: 'entry-1', isApproved: true, approvedAt: '2026-06-22T05:18:00.000Z' };
    timesheetsApi.approveTimesheetEntry.mockResolvedValue(confirmation);
    const { result } = renderHook(() => useApproveTimesheetEntry(), { wrapper });

    let approved: typeof confirmation | undefined;
    await act(async () => {
      approved = await result.current.approveEntry('entry-1');
    });

    expect(approved).toEqual(confirmation);
    expect(timesheetsApi.approveTimesheetEntry).toHaveBeenCalledWith('entry-1');
  });

  it('surfaces an error message on failure', async () => {
    timesheetsApi.approveTimesheetEntry.mockRejectedValue(new Error('not authorized'));
    const { result } = renderHook(() => useApproveTimesheetEntry(), { wrapper });

    await act(async () => {
      try {
        await result.current.approveEntry('entry-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
