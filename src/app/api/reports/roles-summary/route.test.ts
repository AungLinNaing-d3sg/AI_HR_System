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
  getUserRolesSummary: jest.fn(),
}));

const reportsBackend = jest.requireMock('../../../../lib/api/reportsBackend.api') as {
  getUserRolesSummary: jest.Mock;
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
  return new Request(`https://example.com/api/reports/roles-summary${query}`);
}

const summaryDto = {
  StartDate: '2025-01-01',
  EndDate: '2025-03-07',
  Summary: [{ ResourceRoleType: { Id: 'role-1', Name: 'Senior Developer' }, TotalHours: 24, UserCount: 1 }],
  GrandTotalHours: 24,
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

describe('GET /api/reports/roles-summary', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    reportsBackend.getUserRolesSummary.mockReset();
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

  it('returns 400 when required date filters are missing', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    const response = await GET(requestWithQuery(''));
    expect(response.status).toBe(400);
  });

  it('generates the summary for a SystemAdmin and maps the response', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    reportsBackend.getUserRolesSummary.mockResolvedValue(summaryDto);

    const response = await GET(requestWithQuery('?startDate=2025-01-01&endDate=2025-03-07'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(reportsBackend.getUserRolesSummary).toHaveBeenCalledWith(
      { startDate: '2025-01-01', endDate: '2025-03-07' },
      expect.any(String)
    );
    expect(body.summary.grandTotalHours).toBe(24);
    expect(body.summary.summary[0].resourceRoleType.name).toBe('Senior Developer');
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    reportsBackend.getUserRolesSummary.mockRejectedValue(new Error('network down'));

    const response = await GET(requestWithQuery('?startDate=2025-01-01&endDate=2025-01-31'));
    expect(response.status).toBe(500);
  });
});
