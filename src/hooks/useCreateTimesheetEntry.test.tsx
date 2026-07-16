import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useCreateTimesheetEntry } from './useCreateTimesheetEntry';
import type { TimesheetEntry } from '@/types/domain.types';

jest.mock('../lib/api/timesheets.api', () => ({
  createTimesheetEntry: jest.fn(),
}));

const timesheetsApi = jest.requireMock('../lib/api/timesheets.api') as { createTimesheetEntry: jest.Mock };

const createdEntry: TimesheetEntry = {
  id: 'entry-1',
  projectId: 'project-1',
  timesheetPeriodId: 'period-1',
  entryDate: '2025-02-24',
  hours: 6,
  taskDescription: 'Frontend component development',
  isApproved: false,
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const values = {
  projectId: 'project-1',
  timesheetPeriodId: 'period-1',
  entryDate: '2025-02-24',
  hours: 6,
  taskDescription: 'Frontend component development',
};

describe('useCreateTimesheetEntry', () => {
  beforeEach(() => {
    timesheetsApi.createTimesheetEntry.mockReset();
  });

  it('creates the entry and returns it', async () => {
    timesheetsApi.createTimesheetEntry.mockResolvedValue(createdEntry);
    const { result } = renderHook(() => useCreateTimesheetEntry(), { wrapper });

    let created: TimesheetEntry | undefined;
    await act(async () => {
      created = await result.current.createEntry(values);
    });

    expect(created).toEqual(createdEntry);
  });

  it('surfaces an error message on failure', async () => {
    timesheetsApi.createTimesheetEntry.mockRejectedValue(new Error('locked period'));
    const { result } = renderHook(() => useCreateTimesheetEntry(), { wrapper });

    await act(async () => {
      try {
        await result.current.createEntry(values);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
