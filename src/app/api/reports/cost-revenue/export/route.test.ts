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
  exportMonthlyCostRevenue: jest.fn(),
  exportMyCostRevenue: jest.fn(),
}));

const reportsBackend = jest.requireMock('../../../../../lib/api/reportsBackend.api') as {
  exportMonthlyCostRevenue: jest.Mock;
  exportMyCostRevenue: jest.Mock;
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
  return new Request(`https://example.com/api/reports/cost-revenue/export${query}`);
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

describe('GET /api/reports/cost-revenue/export', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    reportsBackend.exportMonthlyCostRevenue.mockReset();
    reportsBackend.exportMyCostRevenue.mockReset();
  });

  it('returns 403 for a plain User', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    const response = await GET(requestWithQuery('?year=2025&month=1'));
    expect(response.status).toBe(403);
  });

  it('streams the exported file back with the backend content type', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    const buffer = new TextEncoder().encode('xlsx-bytes').buffer as ArrayBuffer;
    reportsBackend.exportMonthlyCostRevenue.mockResolvedValue({
      data: buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const response = await GET(requestWithQuery('?year=2025&month=1'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toContain('cost-revenue-report.xlsx');
    expect(reportsBackend.exportMonthlyCostRevenue).toHaveBeenCalledWith(
      { year: 2025, month: 1, format: 'xlsx' },
      expect.any(String)
    );
    expect(reportsBackend.exportMyCostRevenue).not.toHaveBeenCalled();
  });

  it('exports the report for a ProjectAdmin via the My-scoped endpoint', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );
    const buffer = new TextEncoder().encode('xlsx-bytes').buffer as ArrayBuffer;
    reportsBackend.exportMyCostRevenue.mockResolvedValue({
      data: buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const response = await GET(requestWithQuery('?year=2025&month=1'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toContain('cost-revenue-report.xlsx');
    expect(reportsBackend.exportMyCostRevenue).toHaveBeenCalledWith(
      { year: 2025, month: 1, format: 'xlsx' },
      expect.any(String)
    );
    expect(reportsBackend.exportMonthlyCostRevenue).not.toHaveBeenCalled();
  });

  it('returns a normalized error when the backend export fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    reportsBackend.exportMonthlyCostRevenue.mockRejectedValue(new Error('network down'));

    const response = await GET(requestWithQuery('?year=2025&month=1'));
    expect(response.status).toBe(500);
  });
});
