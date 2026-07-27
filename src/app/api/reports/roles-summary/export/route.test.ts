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
  exportUserRolesSummary: jest.fn(),
}));

const reportsBackend = jest.requireMock('../../../../../lib/api/reportsBackend.api') as {
  exportUserRolesSummary: jest.Mock;
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
  return new Request(`https://example.com/api/reports/roles-summary/export${query}`);
}

describe('GET /api/reports/roles-summary/export', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    reportsBackend.exportUserRolesSummary.mockReset();
  });

  it('returns 403 for a plain User', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    const response = await GET(requestWithQuery('?startDate=2025-01-01&endDate=2025-01-31'));
    expect(response.status).toBe(403);
  });

  it('streams the exported file back with the backend content type', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );
    const buffer = new TextEncoder().encode('csv,bytes').buffer as ArrayBuffer;
    reportsBackend.exportUserRolesSummary.mockResolvedValue({ data: buffer, contentType: 'text/csv' });

    const response = await GET(requestWithQuery('?startDate=2025-01-01&endDate=2025-01-31&format=csv'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv');
    expect(response.headers.get('Content-Disposition')).toContain('user-roles-summary.csv');
  });

  it('returns a normalized error when the backend export fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    reportsBackend.exportUserRolesSummary.mockRejectedValue(new Error('network down'));

    const response = await GET(requestWithQuery('?startDate=2025-01-01&endDate=2025-01-31'));
    expect(response.status).toBe(500);
  });
});
