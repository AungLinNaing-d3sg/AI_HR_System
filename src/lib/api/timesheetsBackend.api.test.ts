/**
 * @jest-environment node
 */
jest.mock('./backendClient', () => ({
  backendClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const { backendClient } = jest.requireMock('./backendClient') as {
  backendClient: { get: jest.Mock; post: jest.Mock; put: jest.Mock; delete: jest.Mock };
};

import * as timesheetsBackend from './timesheetsBackend.api';

describe('timesheetsBackend.api (server)', () => {
  beforeEach(() => {
    backendClient.get.mockReset();
    backendClient.post.mockReset();
    backendClient.put.mockReset();
    backendClient.delete.mockReset();
  });

  it('getTimesheetPeriods gets /TimesheetPeriod/GetAllTimesheetPeriods with a Bearer header and query params', async () => {
    backendClient.get.mockResolvedValue({ data: [] });
    await timesheetsBackend.getTimesheetPeriods('access-token', { year: 2025 });
    expect(backendClient.get).toHaveBeenCalledWith('/TimesheetPeriod/GetAllTimesheetPeriods', {
      headers: { Authorization: 'Bearer access-token' },
      params: { year: 2025 },
    });
  });

  it('getTimesheetPeriods defaults to no query params', async () => {
    backendClient.get.mockResolvedValue({ data: [] });
    await timesheetsBackend.getTimesheetPeriods('access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/TimesheetPeriod/GetAllTimesheetPeriods', {
      headers: { Authorization: 'Bearer access-token' },
      params: {},
    });
  });

  it('getTimesheetEntries gets /TimesheetEntry/GetAllTimesheetEntries with a Bearer header and query params', async () => {
    backendClient.get.mockResolvedValue({ data: [] });
    await timesheetsBackend.getTimesheetEntries('access-token', { userId: 'user-1' });
    expect(backendClient.get).toHaveBeenCalledWith('/TimesheetEntry/GetAllTimesheetEntries', {
      headers: { Authorization: 'Bearer access-token' },
      params: { userId: 'user-1' },
    });
  });

  it('createTimesheetEntry posts to /TimesheetEntry/CreateTimesheetEntry with a Bearer header', async () => {
    backendClient.post.mockResolvedValue({ data: { Id: 'entry-1' } });
    const payload = {
      ProjectId: 'project-1',
      TimesheetPeriodId: 'period-1',
      EntryDate: '2025-02-24',
      Hours: 6,
      TaskDescription: 'Frontend component development',
    };
    await timesheetsBackend.createTimesheetEntry(payload, 'access-token');
    expect(backendClient.post).toHaveBeenCalledWith('/TimesheetEntry/CreateTimesheetEntry', payload, {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('updateTimesheetEntry puts to /TimesheetEntry/UpdateTimesheetEntry/:id with a Bearer header', async () => {
    // Real backend returns `Data: null` on success - nothing for the caller to read off `response.data`.
    backendClient.put.mockResolvedValue({ data: null });
    const payload = { Hours: 4, TaskDescription: 'Updated notes' };
    await timesheetsBackend.updateTimesheetEntry('entry-1', payload, 'access-token');
    expect(backendClient.put).toHaveBeenCalledWith(
      '/TimesheetEntry/UpdateTimesheetEntry/entry-1',
      payload,
      { headers: { Authorization: 'Bearer access-token' } }
    );
  });

  it('approveTimesheetEntry puts to /TimesheetEntry/ApproveTimesheetEntry/:id with a Bearer header', async () => {
    const dto = { Id: 'entry-1', IsApproved: true, ApprovedAt: '2026-06-22T05:18:00.000Z', ApprovedBy: 'user-1' };
    backendClient.put.mockResolvedValue({ data: dto });
    const result = await timesheetsBackend.approveTimesheetEntry('entry-1', 'access-token');
    expect(backendClient.put).toHaveBeenCalledWith(
      '/TimesheetEntry/ApproveTimesheetEntry/entry-1',
      undefined,
      { headers: { Authorization: 'Bearer access-token' } }
    );
    expect(result).toEqual(dto);
  });
});
