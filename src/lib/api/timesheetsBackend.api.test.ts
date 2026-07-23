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

  it('createTimesheetPeriod posts to /TimesheetPeriod/CreateTimesheetPeriod with a Bearer header', async () => {
    const dto = { Id: 'period-1', PeriodStart: '2026-03-01', PeriodEnd: '2026-05-15', IsLocked: false };
    backendClient.post.mockResolvedValue({ data: dto });
    const payload = { PeriodStart: '2026-03-01', PeriodEnd: '2026-05-15' };
    const result = await timesheetsBackend.createTimesheetPeriod(payload, 'access-token');
    expect(backendClient.post).toHaveBeenCalledWith('/TimesheetPeriod/CreateTimesheetPeriod', payload, {
      headers: { Authorization: 'Bearer access-token' },
    });
    expect(result).toEqual(dto);
  });

  it('deleteTimesheetPeriod deletes /TimesheetPeriod/DeleteTimesheetPeriod/:id with a Bearer header', async () => {
    backendClient.delete.mockResolvedValue({ data: null });
    await timesheetsBackend.deleteTimesheetPeriod('period-1', 'access-token');
    expect(backendClient.delete).toHaveBeenCalledWith('/TimesheetPeriod/DeleteTimesheetPeriod/period-1', {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('lockTimesheetPeriod puts to /TimesheetPeriod/LockTimesheetPeriod/:id and returns the LockedAt confirmation', async () => {
    const dto = { LockedAt: '2026-06-22T01:26:23.930Z' };
    backendClient.put.mockResolvedValue({ data: dto });
    const result = await timesheetsBackend.lockTimesheetPeriod('period-1', 'access-token');
    expect(backendClient.put).toHaveBeenCalledWith(
      '/TimesheetPeriod/LockTimesheetPeriod/period-1',
      undefined,
      { headers: { Authorization: 'Bearer access-token' } }
    );
    expect(result).toEqual(dto);
  });

  it('unlockTimesheetPeriod puts to /TimesheetPeriod/UnlockTimesheetPeriod/:id with a Bearer header', async () => {
    backendClient.put.mockResolvedValue({ data: null });
    await timesheetsBackend.unlockTimesheetPeriod('period-1', 'access-token');
    expect(backendClient.put).toHaveBeenCalledWith(
      '/TimesheetPeriod/UnlockTimesheetPeriod/period-1',
      undefined,
      { headers: { Authorization: 'Bearer access-token' } }
    );
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

  it('getTimesheetEntryById gets /TimesheetEntry/GetTimesheetEntryById/:id with a Bearer header', async () => {
    const dto = {
      Id: 'entry-1',
      UserId: 'user-1',
      ProjectId: 'project-1',
      TimesheetPeriodId: 'period-1',
      EntryDate: '2025-02-24',
      Hours: 6,
      TaskDescription: 'Frontend component development',
      IsApproved: false,
    };
    backendClient.get.mockResolvedValue({ data: dto });
    const result = await timesheetsBackend.getTimesheetEntryById('entry-1', 'access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/TimesheetEntry/GetTimesheetEntryById/entry-1', {
      headers: { Authorization: 'Bearer access-token' },
    });
    expect(result).toEqual(dto);
  });

  it('deleteTimesheetEntry deletes /TimesheetEntry/DeleteTimesheetEntry/:id with a Bearer header', async () => {
    backendClient.delete.mockResolvedValue({ data: null });
    await timesheetsBackend.deleteTimesheetEntry('entry-1', 'access-token');
    expect(backendClient.delete).toHaveBeenCalledWith('/TimesheetEntry/DeleteTimesheetEntry/entry-1', {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('getProjectAdminTimesheetSummary gets /TimesheetEntry/GetProjectAdminTimesheetSummary with a Bearer header and default (empty) query', async () => {
    const dto = {
      TotalHours: 40,
      ApprovedHours: 20,
      PendingHours: 20,
      ProjectSummaries: [
        { ProjectId: 'project-1', ProjectCode: 'D3SG001', ProjectName: 'STP Enhancement', TotalHours: 40, ApprovedHours: 20, PendingHours: 20 },
      ],
      Entries: [],
    };
    backendClient.get.mockResolvedValue({ data: dto });
    const result = await timesheetsBackend.getProjectAdminTimesheetSummary('access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/TimesheetEntry/GetProjectAdminTimesheetSummary', {
      headers: { Authorization: 'Bearer access-token' },
      params: {},
    });
    expect(result).toEqual(dto);
  });

  it('getProjectAdminTimesheetSummary forwards a projectId filter when given one', async () => {
    backendClient.get.mockResolvedValue({ data: null });
    await timesheetsBackend.getProjectAdminTimesheetSummary('access-token', { projectId: 'project-1' });
    expect(backendClient.get).toHaveBeenCalledWith('/TimesheetEntry/GetProjectAdminTimesheetSummary', {
      headers: { Authorization: 'Bearer access-token' },
      params: { projectId: 'project-1' },
    });
  });
});
