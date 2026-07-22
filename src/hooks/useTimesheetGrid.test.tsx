import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useTimesheetGrid } from './useTimesheetGrid';
import type { Project, TimesheetEntry, TimesheetWeek } from '@/types/domain.types';

jest.mock('../lib/api/timesheets.api', () => ({
  getTimesheetWeek: jest.fn(),
  createTimesheetEntry: jest.fn(),
  updateTimesheetEntry: jest.fn(),
}));

const timesheetsApi = jest.requireMock('../lib/api/timesheets.api') as {
  getTimesheetWeek: jest.Mock;
  createTimesheetEntry: jest.Mock;
  updateTimesheetEntry: jest.Mock;
};

const project: Project = {
  id: 'project-1',
  code: 'PRJ-ALPHA',
  name: 'Project Alpha - Web Platform',
  description: null,
  clientName: 'Acme Corp',
  clientEmail: null,
  startDate: null,
  endDate: null,
  maxDailyHours: null,
  isActive: true,
};

const existingEntry: TimesheetEntry = {
  id: 'entry-1',
  projectId: 'project-1',
  timesheetPeriodId: 'period-1',
  entryDate: '2025-02-24',
  hours: 6,
  taskDescription: 'Frontend component development',
  isApproved: false,
};

function weekWith(overrides: Partial<TimesheetWeek> = {}): TimesheetWeek {
  return {
    weekStart: '2025-02-24',
    weekEnd: '2025-03-02',
    period: { id: 'period-1', periodStart: '2025-02-01', periodEnd: '2025-02-28', isLocked: false },
    projects: [project],
    entries: [existingEntry],
    ...overrides,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useTimesheetGrid', () => {
  beforeEach(() => {
    timesheetsApi.getTimesheetWeek.mockReset();
    timesheetsApi.createTimesheetEntry.mockReset();
    timesheetsApi.updateTimesheetEntry.mockReset();
  });

  it('builds one row per active project with the existing entry pre-filled', async () => {
    timesheetsApi.getTimesheetWeek.mockResolvedValue(weekWith());
    const { result } = renderHook(() => useTimesheetGrid('2025-02-24'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0].cells[0].hours).toBe(6);
    expect(result.current.rows[0].totalHours).toBe(6);
    expect(result.current.dailyTotals[0]).toBe(6);
    expect(result.current.hasPeriod).toBe(true);
    expect(result.current.isLocked).toBe(false);
    expect(result.current.canEdit).toBe(true);
  });

  it('marks a cell dirty and recomputes totals when a valid hours value is entered', async () => {
    timesheetsApi.getTimesheetWeek.mockResolvedValue(weekWith());
    const { result } = renderHook(() => useTimesheetGrid('2025-02-24'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setCell('project-1', '2025-02-25', { hoursInput: '4' });
    });

    expect(result.current.rows[0].cells[1].hours).toBe(4);
    expect(result.current.rows[0].cells[1].isDirty).toBe(true);
    expect(result.current.rows[0].cells[1].error).toBeNull();
    expect(result.current.rows[0].totalHours).toBe(10);
    expect(result.current.isDirty).toBe(true);
    expect(result.current.hasValidationErrors).toBe(false);
  });

  it('flags a validation error when hours exceed the daily maximum and blocks saving', async () => {
    timesheetsApi.getTimesheetWeek.mockResolvedValue(weekWith());
    const { result } = renderHook(() => useTimesheetGrid('2025-02-24'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setCell('project-1', '2025-02-25', { hoursInput: '30' });
    });

    expect(result.current.rows[0].cells[1].error).toBeTruthy();
    expect(result.current.hasValidationErrors).toBe(true);

    await act(async () => {
      await result.current.saveAll();
    });

    expect(timesheetsApi.createTimesheetEntry).not.toHaveBeenCalled();
    expect(timesheetsApi.updateTimesheetEntry).not.toHaveBeenCalled();
  });

  it('creates a new entry for a cell with no existing entry and positive hours', async () => {
    timesheetsApi.getTimesheetWeek.mockResolvedValue(weekWith());
    timesheetsApi.createTimesheetEntry.mockResolvedValue({ ...existingEntry, id: 'entry-2', entryDate: '2025-02-25', hours: 5 });
    const { result } = renderHook(() => useTimesheetGrid('2025-02-24'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setCell('project-1', '2025-02-25', { hoursInput: '5' });
    });

    await act(async () => {
      await result.current.saveAll();
    });

    expect(timesheetsApi.createTimesheetEntry).toHaveBeenCalledWith({
      projectId: 'project-1',
      timesheetPeriodId: 'period-1',
      entryDate: '2025-02-25',
      hours: 5,
      taskDescription: '',
    });
    expect(timesheetsApi.updateTimesheetEntry).not.toHaveBeenCalled();
  });

  it('updates an existing entry when the cell already has one', async () => {
    timesheetsApi.getTimesheetWeek.mockResolvedValue(weekWith());
    timesheetsApi.updateTimesheetEntry.mockResolvedValue({ ...existingEntry, hours: 3 });
    const { result } = renderHook(() => useTimesheetGrid('2025-02-24'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setCell('project-1', '2025-02-24', { hoursInput: '3' });
    });

    await act(async () => {
      await result.current.saveAll();
    });

    expect(timesheetsApi.updateTimesheetEntry).toHaveBeenCalledWith('entry-1', {
      hours: 3,
      taskDescription: 'Frontend component development',
    });
    expect(timesheetsApi.createTimesheetEntry).not.toHaveBeenCalled();
  });

  it('skips cells with no existing entry and 0 hours entirely', async () => {
    timesheetsApi.getTimesheetWeek.mockResolvedValue(weekWith());
    const { result } = renderHook(() => useTimesheetGrid('2025-02-24'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setCell('project-1', '2025-02-26', { hoursInput: '' });
    });

    await act(async () => {
      await result.current.saveAll();
    });

    expect(timesheetsApi.createTimesheetEntry).not.toHaveBeenCalled();
    expect(timesheetsApi.updateTimesheetEntry).not.toHaveBeenCalled();
  });

  it('does not allow editing an approved cell', async () => {
    timesheetsApi.getTimesheetWeek.mockResolvedValue(
      weekWith({ entries: [{ ...existingEntry, isApproved: true }] })
    );
    const { result } = renderHook(() => useTimesheetGrid('2025-02-24'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rows[0].cells[0].isApproved).toBe(true);

    act(() => {
      result.current.setCell('project-1', '2025-02-24', { hoursInput: '2' });
    });

    await act(async () => {
      await result.current.saveAll();
    });

    // Even though the cell was locally edited, the approved cell is skipped when saving.
    expect(timesheetsApi.updateTimesheetEntry).not.toHaveBeenCalled();
  });

  it('reflects a locked period via isLocked/canEdit', async () => {
    timesheetsApi.getTimesheetWeek.mockResolvedValue(
      weekWith({ period: { id: 'period-1', periodStart: '2025-02-01', periodEnd: '2025-02-28', isLocked: true } })
    );
    const { result } = renderHook(() => useTimesheetGrid('2025-02-24'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isLocked).toBe(true);
    expect(result.current.canEdit).toBe(false);
  });

  it('reflects no period covering the week via hasPeriod', async () => {
    timesheetsApi.getTimesheetWeek.mockResolvedValue(weekWith({ period: null }));
    const { result } = renderHook(() => useTimesheetGrid('2025-02-24'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasPeriod).toBe(false);
    expect(result.current.canEdit).toBe(false);
  });

  it('clears pending edits when navigating to the next/previous week', async () => {
    timesheetsApi.getTimesheetWeek.mockResolvedValue(weekWith());
    const { result } = renderHook(() => useTimesheetGrid('2025-02-24'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setCell('project-1', '2025-02-25', { hoursInput: '4' });
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.goToNextWeek();
    });

    expect(result.current.weekStart).toBe('2025-03-03');
    expect(result.current.isDirty).toBe(false);
  });

  it('jumps to the Monday of the selected period\'s start date and clears pending edits', async () => {
    timesheetsApi.getTimesheetWeek.mockResolvedValue(weekWith());
    const { result } = renderHook(() => useTimesheetGrid('2025-02-24'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setCell('project-1', '2025-02-25', { hoursInput: '4' });
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      // 2025-03-19 is a Wednesday; the containing week's Monday is 2025-03-17.
      result.current.goToPeriod({ id: 'period-2', periodStart: '2025-03-19', periodEnd: '2025-04-15', isLocked: false });
    });

    expect(result.current.weekStart).toBe('2025-03-17');
    expect(result.current.isDirty).toBe(false);
  });
});
