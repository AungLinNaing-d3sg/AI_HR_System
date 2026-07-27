/**
 * @jest-environment node
 */
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';

const mockCookieStore = {
  get: jest.fn(),
};

jest.mock('next/headers', () => ({
  cookies: () => Promise.resolve(mockCookieStore),
}));

jest.mock('../../../../../../lib/api/timesheetsBackend.api', () => ({
  approveTimesheetEntry: jest.fn(),
  getTimesheetEntryById: jest.fn(),
  getProjectAdminTimesheetSummary: jest.fn(),
}));

const timesheetsBackend = jest.requireMock('../../../../../../lib/api/timesheetsBackend.api') as {
  approveTimesheetEntry: jest.Mock;
  getTimesheetEntryById: jest.Mock;
  getProjectAdminTimesheetSummary: jest.Mock;
};

import { PUT } from './route';

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

function tokenFor(role: string): string {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ sub: 'user-1', role, exp: futureExp });
}

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

const request = new Request('https://example.com/api/timesheets/entries/entry-1/approve', { method: 'PUT' });

describe('PUT /api/timesheets/entries/:id/approve', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    timesheetsBackend.approveTimesheetEntry.mockReset();
    timesheetsBackend.getTimesheetEntryById.mockReset();
    timesheetsBackend.getProjectAdminTimesheetSummary.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await PUT(request, paramsFor('entry-1'));
    expect(response.status).toBe(401);
    expect(timesheetsBackend.approveTimesheetEntry).not.toHaveBeenCalled();
  });

  it('returns 403 for a plain User', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    const response = await PUT(request, paramsFor('entry-1'));
    expect(response.status).toBe(403);
    expect(timesheetsBackend.approveTimesheetEntry).not.toHaveBeenCalled();
  });

  it('approves the entry for a ProjectAdmin assigned to that entry\'s project', async () => {
    const token = tokenFor('ProjectAdmin');
    mockCookieStore.get.mockImplementation((name: string) => (name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined));
    timesheetsBackend.getTimesheetEntryById.mockResolvedValue({ Id: 'entry-1', ProjectId: 'project-1' });
    timesheetsBackend.getProjectAdminTimesheetSummary.mockResolvedValue({
      TotalHours: 0,
      ApprovedHours: 0,
      PendingHours: 0,
      ProjectSummaries: [
        { ProjectId: 'project-1', ProjectCode: 'PRJ-001', ProjectName: 'Project Helix', TotalHours: 0, ApprovedHours: 0, PendingHours: 0 },
      ],
      Entries: [],
    });
    timesheetsBackend.approveTimesheetEntry.mockResolvedValue({
      Id: 'entry-1',
      IsApproved: true,
      ApprovedAt: '2026-06-22T05:18:00.000Z',
      ApprovedBy: 'user-1',
    });

    const response = await PUT(request, paramsFor('entry-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ id: 'entry-1', isApproved: true, approvedAt: '2026-06-22T05:18:00.000Z' });
    expect(timesheetsBackend.approveTimesheetEntry).toHaveBeenCalledWith('entry-1', token);
  });

  it('returns 403 when a ProjectAdmin tries to approve an entry for a project they are not assigned to', async () => {
    const token = tokenFor('ProjectAdmin');
    mockCookieStore.get.mockImplementation((name: string) => (name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined));
    timesheetsBackend.getTimesheetEntryById.mockResolvedValue({ Id: 'entry-1', ProjectId: 'project-99' });
    timesheetsBackend.getProjectAdminTimesheetSummary.mockResolvedValue({
      TotalHours: 0,
      ApprovedHours: 0,
      PendingHours: 0,
      ProjectSummaries: [],
      Entries: [],
    });

    const response = await PUT(request, paramsFor('entry-1'));
    expect(response.status).toBe(403);
    expect(timesheetsBackend.approveTimesheetEntry).not.toHaveBeenCalled();
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    timesheetsBackend.approveTimesheetEntry.mockRejectedValue(new Error('entry not found'));

    const response = await PUT(request, paramsFor('entry-1'));
    expect(response.status).toBe(500);
  });
});
