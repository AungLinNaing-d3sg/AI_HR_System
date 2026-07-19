import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useUpdateTimesheetEntry } from './useUpdateTimesheetEntry';

jest.mock('../lib/api/timesheets.api', () => ({
  updateTimesheetEntry: jest.fn(),
}));

const timesheetsApi = jest.requireMock('../lib/api/timesheets.api') as { updateTimesheetEntry: jest.Mock };

// The real backend returns no entry fields on a successful update (see
// UpdateTimesheetEntryResponse in api.types.ts) - only what was submitted is echoed back.
const updatedEntry = { id: 'entry-1', hours: 4, taskDescription: 'Updated notes' };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useUpdateTimesheetEntry', () => {
  beforeEach(() => {
    timesheetsApi.updateTimesheetEntry.mockReset();
  });

  it('updates the entry and returns it', async () => {
    timesheetsApi.updateTimesheetEntry.mockResolvedValue(updatedEntry);
    const { result } = renderHook(() => useUpdateTimesheetEntry(), { wrapper });

    let updated: { id: string; hours: number; taskDescription: string | null } | undefined;
    await act(async () => {
      updated = await result.current.updateEntry({
        id: 'entry-1',
        values: { hours: 4, taskDescription: 'Updated notes' },
      });
    });

    expect(updated).toEqual(updatedEntry);
    expect(timesheetsApi.updateTimesheetEntry).toHaveBeenCalledWith('entry-1', {
      hours: 4,
      taskDescription: 'Updated notes',
    });
  });

  it('surfaces an error message on failure', async () => {
    timesheetsApi.updateTimesheetEntry.mockRejectedValue(new Error('entry is approved'));
    const { result } = renderHook(() => useUpdateTimesheetEntry(), { wrapper });

    await act(async () => {
      try {
        await result.current.updateEntry({ id: 'entry-1', values: { hours: 4, taskDescription: '' } });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
