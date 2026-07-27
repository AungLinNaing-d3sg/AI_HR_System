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

jest.mock('../../../../lib/api/reportsBackend.api', () => ({
  getTimesheetReport: jest.fn(),
}));

const reportsBackend = jest.requireMock('../../../../lib/api/reportsBackend.api') as {
  getTimesheetReport: jest.Mock;
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

function requestWithQuery(query: string): Request {
  return new Request(`https://example.com/api/reports/timesheet${query}`);
}

const reportDto = {
  ReportGeneratedAt: '2026-06-22T05:37:30.222Z',
  StartDate: '2025-01-01',
  EndDate: '2025-01-31',
  TotalHours: 6,
  TotalCount: 1,
  Page: 1,
  PageSize: 500,
  Items: [
    {
      User: { Id: 'user-1', FullName: 'Lin Thit Htoo', EmployeeId: 'EMP003' },
      Project: { Id: 'project-1', Code: 'PRJ-001', Name: 'Project Helix' },
      EntryDate: '2025-01-05',
      Hours: 6,
      TaskDescription: 'Frontend work',
      IsApproved: true,
    },
  ],
};

describe('GET /api/reports/timesheet', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    reportsBackend.getTimesheetReport.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET(requestWithQuery('?startDate=2025-01-01&endDate=2025-01-31'));
    expect(response.status).toBe(401);
    expect(reportsBackend.getTimesheetReport).not.toHaveBeenCalled();
  });

  it('returns 403 for a plain User', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    const response = await GET(requestWithQuery('?startDate=2025-01-01&endDate=2025-01-31'));
    expect(response.status).toBe(403);
    expect(reportsBackend.getTimesheetReport).not.toHaveBeenCalled();
  });

  it('returns 400 when required date filters are missing', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    const response = await GET(requestWithQuery(''));
    expect(response.status).toBe(400);
    expect(reportsBackend.getTimesheetReport).not.toHaveBeenCalled();
  });

  it('returns 400 when endDate is before startDate', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );
    const response = await GET(requestWithQuery('?startDate=2025-02-01&endDate=2025-01-01'));
    expect(response.status).toBe(400);
  });

  it('generates the report for a ProjectAdmin and maps the response', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );
    reportsBackend.getTimesheetReport.mockResolvedValue(reportDto);

    const response = await GET(requestWithQuery('?startDate=2025-01-01&endDate=2025-01-31&projectId=project-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(reportsBackend.getTimesheetReport).toHaveBeenCalledWith(
      {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        projectId: 'project-1',
        userId: undefined,
        isApproved: undefined,
        page: 1,
        pageSize: 500,
      },
      expect.any(String)
    );
    expect(body.report.totalHours).toBe(6);
    expect(body.report.items[0].user.fullName).toBe('Lin Thit Htoo');
  });

  it('forwards pageNo/pageSize query params to the backend', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    reportsBackend.getTimesheetReport.mockResolvedValue(reportDto);

    await GET(requestWithQuery('?startDate=2025-01-01&endDate=2025-01-31&pageNo=2&pageSize=20'));

    expect(reportsBackend.getTimesheetReport).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 20 }),
      expect.any(String)
    );
  });

  it('translates isApproved=true into a boolean before calling the backend', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    reportsBackend.getTimesheetReport.mockResolvedValue(reportDto);

    await GET(requestWithQuery('?startDate=2025-01-01&endDate=2025-01-31&isApproved=true'));

    expect(reportsBackend.getTimesheetReport).toHaveBeenCalledWith(
      expect.objectContaining({ isApproved: true }),
      expect.any(String)
    );
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    reportsBackend.getTimesheetReport.mockRejectedValue(new Error('network down'));

    const response = await GET(requestWithQuery('?startDate=2025-01-01&endDate=2025-01-31'));
    expect(response.status).toBe(500);
  });
});
