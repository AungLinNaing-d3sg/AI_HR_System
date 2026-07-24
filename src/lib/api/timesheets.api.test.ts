jest.mock('./axios', () => ({
  axiosInstance: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const { axiosInstance } = jest.requireMock('./axios') as {
  axiosInstance: { get: jest.Mock; post: jest.Mock; put: jest.Mock; delete: jest.Mock };
};

import * as timesheetsApi from './timesheets.api';
import type { TimesheetEntry, TimesheetWeek } from '@/types/domain.types';

const entry: TimesheetEntry = {
  id: 'entry-1',
  projectId: 'project-1',
  timesheetPeriodId: 'period-1',
  entryDate: '2025-02-24',
  hours: 6,
  taskDescription: 'Frontend component development',
  isApproved: false,
};

const week: TimesheetWeek = {
  weekStart: '2025-02-24',
  weekEnd: '2025-03-02',
  period: { id: 'period-1', periodStart: '2025-02-01', periodEnd: '2025-02-28', isLocked: false },
  projects: [],
  entries: [entry],
};

describe('timesheets.api (client)', () => {
  beforeEach(() => {
    axiosInstance.get.mockReset();
    axiosInstance.post.mockReset();
    axiosInstance.put.mockReset();
    axiosInstance.delete.mockReset();
  });

  it('getTimesheetWeek gets /timesheets/week with the weekStart param and returns the combined payload', async () => {
    axiosInstance.get.mockResolvedValue({ data: week });
    const result = await timesheetsApi.getTimesheetWeek('2025-02-24');
    expect(axiosInstance.get).toHaveBeenCalledWith('/timesheets/week', { params: { weekStart: '2025-02-24' } });
    expect(result).toEqual(week);
  });

  it('getTimesheetWeek includes periodId when the Timesheet Period dropdown selects a period explicitly', async () => {
    axiosInstance.get.mockResolvedValue({ data: week });
    await timesheetsApi.getTimesheetWeek('2025-02-24', 'period-1');
    expect(axiosInstance.get).toHaveBeenCalledWith('/timesheets/week', {
      params: { weekStart: '2025-02-24', periodId: 'period-1' },
    });
  });

  it('createTimesheetEntry posts to /timesheets/entries and returns the created entry', async () => {
    axiosInstance.post.mockResolvedValue({ data: { entry } });
    const values = {
      projectId: 'project-1',
      timesheetPeriodId: 'period-1',
      entryDate: '2025-02-24',
      hours: 6,
      taskDescription: 'Frontend component development',
    };
    const result = await timesheetsApi.createTimesheetEntry(values);
    expect(axiosInstance.post).toHaveBeenCalledWith('/timesheets/entries', values);
    expect(result).toEqual(entry);
  });

  it('updateTimesheetEntry puts to /timesheets/entries/:id and returns the echoed id/hours/taskDescription', async () => {
    const echoed = { id: 'entry-1', hours: 6, taskDescription: 'Frontend component development' };
    axiosInstance.put.mockResolvedValue({ data: { entry: echoed } });
    const values = { hours: 6, taskDescription: 'Frontend component development' };
    const result = await timesheetsApi.updateTimesheetEntry('entry-1', values);
    expect(axiosInstance.put).toHaveBeenCalledWith('/timesheets/entries/entry-1', values);
    expect(result).toEqual(echoed);
  });

  it('getTimesheetPeriods gets /timesheets/periods and returns the period list', async () => {
    const periods = [week.period!];
    axiosInstance.get.mockResolvedValue({ data: { periods } });
    const result = await timesheetsApi.getTimesheetPeriods();
    expect(axiosInstance.get).toHaveBeenCalledWith('/timesheets/periods');
    expect(result).toEqual(periods);
  });

  it('createTimesheetPeriod posts to /timesheets/periods and returns the created period', async () => {
    const period = week.period!;
    axiosInstance.post.mockResolvedValue({ data: { period } });
    const values = { periodStart: '2025-02-01', periodEnd: '2025-02-28' };
    const result = await timesheetsApi.createTimesheetPeriod(values);
    expect(axiosInstance.post).toHaveBeenCalledWith('/timesheets/periods', values);
    expect(result).toEqual(period);
  });

  it('deleteTimesheetPeriod deletes /timesheets/periods/:id', async () => {
    axiosInstance.delete.mockResolvedValue({ data: undefined });
    await timesheetsApi.deleteTimesheetPeriod('period-1');
    expect(axiosInstance.delete).toHaveBeenCalledWith('/timesheets/periods/period-1');
  });

  it('lockTimesheetPeriod puts to /timesheets/periods/:id/lock and returns the confirmation', async () => {
    const confirmation = { id: 'period-1', isLocked: true as const, lockedAt: '2026-06-22T01:26:23.930Z' };
    axiosInstance.put.mockResolvedValue({ data: confirmation });
    const result = await timesheetsApi.lockTimesheetPeriod('period-1');
    expect(axiosInstance.put).toHaveBeenCalledWith('/timesheets/periods/period-1/lock');
    expect(result).toEqual(confirmation);
  });

  it('unlockTimesheetPeriod puts to /timesheets/periods/:id/unlock and returns the confirmation', async () => {
    const confirmation = { id: 'period-1', isLocked: false as const };
    axiosInstance.put.mockResolvedValue({ data: confirmation });
    const result = await timesheetsApi.unlockTimesheetPeriod('period-1');
    expect(axiosInstance.put).toHaveBeenCalledWith('/timesheets/periods/period-1/unlock');
    expect(result).toEqual(confirmation);
  });

  it('deleteTimesheetEntry deletes /timesheets/entries/:id', async () => {
    axiosInstance.delete.mockResolvedValue({ data: undefined });
    await timesheetsApi.deleteTimesheetEntry('entry-1');
    expect(axiosInstance.delete).toHaveBeenCalledWith('/timesheets/entries/entry-1');
  });
});
