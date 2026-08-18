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

jest.mock('../../../../lib/api/projectsBackend.api', () => ({
  getProjectList: jest.fn(),
  getProjectAssignments: jest.fn(),
}));

jest.mock('../../../../lib/api/timesheetsBackend.api', () => ({
  getTimesheetPeriods: jest.fn(),
  getTimesheetEntries: jest.fn(),
}));

const projectsBackend = jest.requireMock('../../../../lib/api/projectsBackend.api') as {
  getProjectList: jest.Mock;
  getProjectAssignments: jest.Mock;
};
const timesheetsBackend = jest.requireMock('../../../../lib/api/timesheetsBackend.api') as {
  getTimesheetPeriods: jest.Mock;
  getTimesheetEntries: jest.Mock;
};

import { GET } from './route';

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

function tokenFor(overrides: Record<string, unknown> = {}): string {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ sub: 'user-1', role: 'User', exp: futureExp, ...overrides });
}

function requestFor(weekStart?: string, periodId?: string): Request {
  const url = new URL('https://example.com/api/timesheets/week');
  if (weekStart) url.searchParams.set('weekStart', weekStart);
  if (periodId) url.searchParams.set('periodId', periodId);
  return new Request(url);
}

const projectDto = {
  Id: 'project-1',
  Code: 'PRJ-ALPHA',
  Name: 'Project Alpha - Web Platform',
  Description: null,
  ClientName: 'Acme Corp',
  ClientEmail: null,
  StartDate: null,
  EndDate: null,
  MaxDailyHours: null,
  IsActive: true,
};

const periodDto = {
  Id: 'period-1',
  PeriodStart: '2025-02-01',
  PeriodEnd: '2025-02-28',
  IsLocked: false,
};

const entryDto = {
  Id: 'entry-1',
  UserId: 'user-1',
  ProjectId: 'project-1',
  TimesheetPeriodId: 'period-1',
  EntryDate: '2025-02-24',
  Hours: 6,
  TaskDescription: 'Frontend component development',
  IsApproved: false,
};

// This route handler intentionally exercises a failure path that calls
// `logger.error` (see lib/utils/logger.ts), which forwards to the real
// console. Silence it here so the negative-path test run stays noise-free,
// without masking genuinely unexpected console output.
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/timesheets/week', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    projectsBackend.getProjectList.mockReset();
    projectsBackend.getProjectAssignments.mockReset();
    projectsBackend.getProjectAssignments.mockResolvedValue([{ UserId: 'user-1', IsActive: true }]);
    timesheetsBackend.getTimesheetPeriods.mockReset();
    timesheetsBackend.getTimesheetEntries.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET(requestFor('2025-02-24'));
    expect(response.status).toBe(401);
    expect(projectsBackend.getProjectList).not.toHaveBeenCalled();
  });

  it('returns 401 when the token has no recognizable user-id claim', async () => {
    const token = makeToken({ role: 'User', exp: Math.floor(Date.now() / 1000) + 3600 });
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );

    const response = await GET(requestFor('2025-02-24'));
    expect(response.status).toBe(401);
  });

  it('joins projects, the covering period, and this week\'s entries for the caller', async () => {
    const token = tokenFor();
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.getProjectList.mockResolvedValue([projectDto]);
    timesheetsBackend.getTimesheetPeriods.mockResolvedValue([periodDto]);
    timesheetsBackend.getTimesheetEntries.mockResolvedValue({
      Items: [entryDto],
      TotalCount: 1,
      TotalPages: 1,
      PageNo: 1,
      PageSize: 100,
    });

    const response = await GET(requestFor('2025-02-24'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.weekStart).toBe('2025-02-24');
    expect(body.weekEnd).toBe('2025-03-02');
    expect(body.period).toEqual({
      id: 'period-1',
      periodStart: '2025-02-01',
      periodEnd: '2025-02-28',
      isLocked: false,
    });
    expect(body.projects).toHaveLength(1);
    expect(body.entries).toHaveLength(1);
    expect(timesheetsBackend.getTimesheetEntries).toHaveBeenCalledWith(token, {
      userId: 'user-1',
      pageSize: 100,
    });
  });

  it('excludes an active project the caller is not assigned to', async () => {
    const token = tokenFor();
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    const unassignedProject = { ...projectDto, Id: 'project-2', Code: 'PRJ-BETA' };
    projectsBackend.getProjectList.mockResolvedValue([projectDto, unassignedProject]);
    projectsBackend.getProjectAssignments.mockImplementation((projectId: string) =>
      Promise.resolve(
        projectId === 'project-1' ? [{ UserId: 'user-1', IsActive: true }] : [{ UserId: 'someone-else', IsActive: true }]
      )
    );
    timesheetsBackend.getTimesheetPeriods.mockResolvedValue([periodDto]);
    timesheetsBackend.getTimesheetEntries.mockResolvedValue({
      Items: [entryDto],
      TotalCount: 1,
      TotalPages: 1,
      PageNo: 1,
      PageSize: 100,
    });

    const response = await GET(requestFor('2025-02-24'));
    const body = await response.json();

    expect(body.projects).toHaveLength(1);
    expect(body.projects[0].id).toBe('project-1');
  });

  it('excludes an inactive project even if the caller is assigned to it', async () => {
    const token = tokenFor();
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.getProjectList.mockResolvedValue([{ ...projectDto, IsActive: false }]);
    timesheetsBackend.getTimesheetPeriods.mockResolvedValue([]);
    timesheetsBackend.getTimesheetEntries.mockResolvedValue({
      Items: [],
      TotalCount: 0,
      TotalPages: 0,
      PageNo: 1,
      PageSize: 100,
    });

    const response = await GET(requestFor('2025-02-24'));
    const body = await response.json();

    expect(body.projects).toEqual([]);
    expect(projectsBackend.getProjectAssignments).not.toHaveBeenCalled();
  });

  it('normalizes a non-Monday weekStart to the Monday of its week', async () => {
    const token = tokenFor();
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.getProjectList.mockResolvedValue([]);
    timesheetsBackend.getTimesheetPeriods.mockResolvedValue([]);
    timesheetsBackend.getTimesheetEntries.mockResolvedValue({
      Items: [],
      TotalCount: 0,
      TotalPages: 0,
      PageNo: 1,
      PageSize: 100,
    });

    const response = await GET(requestFor('2025-02-26'));
    const body = await response.json();

    expect(body.weekStart).toBe('2025-02-24');
  });

  it('returns period: null when no timesheet period covers the requested week', async () => {
    const token = tokenFor();
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.getProjectList.mockResolvedValue([]);
    timesheetsBackend.getTimesheetPeriods.mockResolvedValue([]);
    timesheetsBackend.getTimesheetEntries.mockResolvedValue({
      Items: [],
      TotalCount: 0,
      TotalPages: 0,
      PageNo: 1,
      PageSize: 100,
    });

    const response = await GET(requestFor('2025-02-24'));
    const body = await response.json();

    expect(body.period).toBeNull();
  });

  it('filters out entries dated outside the requested week', async () => {
    const token = tokenFor();
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.getProjectList.mockResolvedValue([]);
    timesheetsBackend.getTimesheetPeriods.mockResolvedValue([]);
    timesheetsBackend.getTimesheetEntries.mockResolvedValue({
      Items: [{ ...entryDto, EntryDate: '2025-03-15' }],
      TotalCount: 1,
      TotalPages: 1,
      PageNo: 1,
      PageSize: 100,
    });

    const response = await GET(requestFor('2025-02-24'));
    const body = await response.json();

    expect(body.entries).toEqual([]);
  });

  it('prefers the requested periodId over the plain overlap lookup when two periods overlap the same week', async () => {
    // Period A ends mid-week (Wed 2025-02-26); Period B starts right after
    // (Thu 2025-02-27) - both overlap the Mon 2025-02-24..Sun 2025-03-02
    // week, and Period A comes first in the list, so a plain
    // find-first-overlap would always resolve to A even when the caller
    // explicitly selected B via the Timesheet Period dropdown.
    const token = tokenFor();
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    const periodA = { ...periodDto, Id: 'period-a', PeriodStart: '2025-02-01', PeriodEnd: '2025-02-26' };
    const periodB = { ...periodDto, Id: 'period-b', PeriodStart: '2025-02-27', PeriodEnd: '2025-03-31' };
    projectsBackend.getProjectList.mockResolvedValue([]);
    timesheetsBackend.getTimesheetPeriods.mockResolvedValue([periodA, periodB]);
    timesheetsBackend.getTimesheetEntries.mockResolvedValue({
      Items: [],
      TotalCount: 0,
      TotalPages: 0,
      PageNo: 1,
      PageSize: 100,
    });

    const response = await GET(requestFor('2025-02-24', 'period-b'));
    const body = await response.json();

    expect(body.period.id).toBe('period-b');
  });

  it('falls back to the plain overlap lookup when the requested periodId does not match any known period', async () => {
    const token = tokenFor();
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.getProjectList.mockResolvedValue([]);
    timesheetsBackend.getTimesheetPeriods.mockResolvedValue([periodDto]);
    timesheetsBackend.getTimesheetEntries.mockResolvedValue({
      Items: [],
      TotalCount: 0,
      TotalPages: 0,
      PageNo: 1,
      PageSize: 100,
    });

    const response = await GET(requestFor('2025-02-24', 'stale-period-id'));
    const body = await response.json();

    expect(body.period.id).toBe('period-1');
  });

  it('still resolves the covering period via overlap when no periodId is requested', async () => {
    const token = tokenFor();
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    const periodA = { ...periodDto, Id: 'period-a', PeriodStart: '2025-02-01', PeriodEnd: '2025-02-26' };
    const periodB = { ...periodDto, Id: 'period-b', PeriodStart: '2025-02-27', PeriodEnd: '2025-03-31' };
    projectsBackend.getProjectList.mockResolvedValue([]);
    timesheetsBackend.getTimesheetPeriods.mockResolvedValue([periodA, periodB]);
    timesheetsBackend.getTimesheetEntries.mockResolvedValue({
      Items: [],
      TotalCount: 0,
      TotalPages: 0,
      PageNo: 1,
      PageSize: 100,
    });

    const response = await GET(requestFor('2025-02-24'));
    const body = await response.json();

    expect(body.period.id).toBe('period-a');
  });

  it('returns a normalized error when a backend call fails', async () => {
    const token = tokenFor();
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.getProjectList.mockRejectedValue(new Error('network down'));
    timesheetsBackend.getTimesheetPeriods.mockResolvedValue([]);
    timesheetsBackend.getTimesheetEntries.mockResolvedValue({
      Items: [],
      TotalCount: 0,
      TotalPages: 0,
      PageNo: 1,
      PageSize: 100,
    });

    const response = await GET(requestFor('2025-02-24'));
    expect(response.status).toBe(500);
  });
});
