import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useTimesheetHistory } from './useTimesheetHistory';
import type { TimesheetHistoryEntry } from '@/types/domain.types';

jest.mock('../lib/api/timesheets.api', () => ({
  getTimesheetHistory: jest.fn(),
}));

const timesheetsApi = jest.requireMock('../lib/api/timesheets.api') as { getTimesheetHistory: jest.Mock };

const entries: TimesheetHistoryEntry[] = [
  {
    id: 'entry-1',
    userId: 'user-1',
    userName: 'Lin Thit Htoo',
    resourceRoleTypeName: 'Senior Developer',
    projectId: 'project-1',
    projectCode: 'PRJ-001',
    projectName: 'Project Helix',
    entryDate: '2025-03-01',
    hours: 8,
    taskDescription: 'Worked on feature implementation',
    isApproved: false,
    approvedAt: null,
  },
];

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const historyResult = { entries, totalCount: entries.length, pageNo: 1, pageSize: 20 };

describe('useTimesheetHistory', () => {
  beforeEach(() => {
    timesheetsApi.getTimesheetHistory.mockReset();
  });

  it('returns the entry list and pagination metadata once loaded', async () => {
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    const { result } = renderHook(() => useTimesheetHistory(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.entries).toEqual(entries);
    expect(result.current.totalCount).toBe(1);
    expect(result.current.isError).toBe(false);
  });

  it('defaults to an empty array and zero totalCount before data loads', () => {
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    const { result } = renderHook(() => useTimesheetHistory(), { wrapper });
    expect(result.current.entries).toEqual([]);
    expect(result.current.totalCount).toBe(0);
  });

  it('forwards pageNo/pageSize to getTimesheetHistory', async () => {
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    renderHook(() => useTimesheetHistory({ pageNo: 2, pageSize: 10 }), { wrapper });

    await waitFor(() => expect(timesheetsApi.getTimesheetHistory).toHaveBeenCalledWith({ pageNo: 2, pageSize: 10 }));
  });

  it('surfaces an error message on failure', async () => {
    timesheetsApi.getTimesheetHistory.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useTimesheetHistory(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });

  it(
    'keeps the previous page\'s entries visible (via placeholderData) while a new page loads, ' +
      'exposing that as isFetching rather than isLoading',
    async () => {
      let resolveSecondPage: (value: typeof historyResult) => void = () => {};
      timesheetsApi.getTimesheetHistory
        .mockResolvedValueOnce(historyResult)
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveSecondPage = resolve;
            })
        );

      const { result, rerender } = renderHook(
        ({ pageNo }: { pageNo: number }) => useTimesheetHistory({ pageNo, pageSize: 20 }),
        { wrapper, initialProps: { pageNo: 1 } }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.entries).toEqual(entries);

      rerender({ pageNo: 2 });

      // The page-2 request is still in flight, but page 1's rows stay put as
      // placeholder data instead of being cleared back to `[]` - the caller
      // (`TimesheetHistoryTable`) uses this to keep its whole layout mounted
      // and only flag the in-progress refetch via `isFetching`.
      await waitFor(() => expect(result.current.isFetching).toBe(true));
      expect(result.current.isLoading).toBe(false);
      expect(result.current.entries).toEqual(entries);

      resolveSecondPage({ ...historyResult, pageNo: 2 });
      await waitFor(() => expect(result.current.isFetching).toBe(false));
    }
  );
});
