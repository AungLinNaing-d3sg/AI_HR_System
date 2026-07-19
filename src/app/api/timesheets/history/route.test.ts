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

jest.mock('../../../../lib/api/timesheetsBackend.api', () => ({
  getTimesheetEntries: jest.fn(),
}));

const timesheetsBackend = jest.requireMock('../../../../lib/api/timesheetsBackend.api') as {
  getTimesheetEntries: jest.Mock;
};

import { GET } from './route';

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

function tokenFor(role: string): string {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ sub: 'user-1', role, exp: futureExp });
}

const entryDto = {
  Id: 'entry-1',
  UserId: 'user-1',
  UserFirstName: 'Lin Thit',
  UserLastName: 'Htoo',
  ProjectId: 'project-1',
  ProjectCode: 'PRJ-001',
  ProjectName: 'Project Helix',
  TimesheetPeriodId: 'period-1',
  EntryDate: '2025-03-01',
  Hours: 8,
  TaskDescription: 'Worked on feature implementation',
  IsApproved: false,
};

describe('GET /api/timesheets/history', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    timesheetsBackend.getTimesheetEntries.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(timesheetsBackend.getTimesheetEntries).not.toHaveBeenCalled();
  });

  it('scopes the query to the caller for a plain User', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    timesheetsBackend.getTimesheetEntries.mockResolvedValue([entryDto]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(timesheetsBackend.getTimesheetEntries).toHaveBeenCalledWith(expect.any(String), { userId: 'user-1' });
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].userName).toBe('Lin Thit Htoo');
    expect(body.entries[0].projectName).toBe('Project Helix');
  });

  it('requests every entry (no userId filter) for a ProjectAdmin', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );
    timesheetsBackend.getTimesheetEntries.mockResolvedValue([entryDto]);

    await GET();

    expect(timesheetsBackend.getTimesheetEntries).toHaveBeenCalledWith(expect.any(String), {});
  });

  it('requests every entry (no userId filter) for a SystemAdmin', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    timesheetsBackend.getTimesheetEntries.mockResolvedValue([]);

    await GET();

    expect(timesheetsBackend.getTimesheetEntries).toHaveBeenCalledWith(expect.any(String), {});
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    timesheetsBackend.getTimesheetEntries.mockRejectedValue(new Error('network down'));

    const response = await GET();
    expect(response.status).toBe(500);
  });
});
