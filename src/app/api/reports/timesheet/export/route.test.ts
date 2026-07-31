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

jest.mock('../../../../../lib/api/reportsBackend.api', () => ({
  exportTimesheetReport: jest.fn(),
  exportMyTimesheetReport: jest.fn(),
}));

const reportsBackend = jest.requireMock('../../../../../lib/api/reportsBackend.api') as {
  exportTimesheetReport: jest.Mock;
  exportMyTimesheetReport: jest.Mock;
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
  return new Request(`https://example.com/api/reports/timesheet/export${query}`);
}

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

describe('GET /api/reports/timesheet/export', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    reportsBackend.exportTimesheetReport.mockReset();
    reportsBackend.exportMyTimesheetReport.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET(requestWithQuery('?startDate=2025-01-01&endDate=2025-01-31'));
    expect(response.status).toBe(401);
  });

  it('returns 403 for a plain User', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    const response = await GET(requestWithQuery('?startDate=2025-01-01&endDate=2025-01-31'));
    expect(response.status).toBe(403);
  });

  it('returns 400 for an unsupported format', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    const response = await GET(requestWithQuery('?startDate=2025-01-01&endDate=2025-01-31&format=pdf'));
    expect(response.status).toBe(400);
    expect(reportsBackend.exportTimesheetReport).not.toHaveBeenCalled();
  });

  it('streams the exported file back with the backend content type and a Content-Disposition header', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    const buffer = new TextEncoder().encode('csv,bytes').buffer as ArrayBuffer;
    reportsBackend.exportTimesheetReport.mockResolvedValue({ data: buffer, contentType: 'text/csv' });

    const response = await GET(requestWithQuery('?startDate=2025-01-01&endDate=2025-01-31&format=csv'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv');
    expect(response.headers.get('Content-Disposition')).toContain('attachment');
    expect(response.headers.get('Content-Disposition')).toContain('.csv');
    expect(reportsBackend.exportTimesheetReport).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: '2025-01-01', endDate: '2025-01-31', format: 'csv' }),
      expect.any(String)
    );
  });

  it('exports the report for a ProjectAdmin via the My-scoped endpoint', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );
    const buffer = new TextEncoder().encode('csv,bytes').buffer as ArrayBuffer;
    reportsBackend.exportMyTimesheetReport.mockResolvedValue({ data: buffer, contentType: 'text/csv' });

    const response = await GET(requestWithQuery('?startDate=2025-01-01&endDate=2025-01-31&format=csv'));

    expect(response.status).toBe(200);
    expect(reportsBackend.exportMyTimesheetReport).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: '2025-01-01', endDate: '2025-01-31', format: 'csv' }),
      expect.any(String)
    );
    expect(reportsBackend.exportTimesheetReport).not.toHaveBeenCalled();
  });

  it('defaults to xlsx when no format is given', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    const buffer = new TextEncoder().encode('xlsx-bytes').buffer as ArrayBuffer;
    reportsBackend.exportTimesheetReport.mockResolvedValue({
      data: buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const response = await GET(requestWithQuery('?startDate=2025-01-01&endDate=2025-01-31'));

    expect(response.status).toBe(200);
    expect(reportsBackend.exportTimesheetReport).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'xlsx' }),
      expect.any(String)
    );
  });

  it('returns a normalized error when the backend export fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    reportsBackend.exportTimesheetReport.mockRejectedValue(new Error('network down'));

    const response = await GET(requestWithQuery('?startDate=2025-01-01&endDate=2025-01-31'));
    expect(response.status).toBe(500);
  });
});
