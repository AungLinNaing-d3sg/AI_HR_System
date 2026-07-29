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
  getMonthlyCostRevenue: jest.fn(),
}));

const reportsBackend = jest.requireMock('../../../../lib/api/reportsBackend.api') as {
  getMonthlyCostRevenue: jest.Mock;
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
  return new Request(`https://example.com/api/reports/cost-revenue${query}`);
}

const reportDto = {
  Year: 2025,
  Month: 3,
  Currency: { Id: 'currency-1', Code: 'SGD', Symbol: 'S$' },
  Projects: [
    {
      Project: { Id: 'project-1', Code: 'PRJ-001', Name: 'Project Helix' },
      TotalHours: 24,
      TotalCost: 600,
      TotalRevenue: 1800,
      Margin: 1200,
      Breakdown: [
        { ResourceRoleType: 'Senior Developer', Hours: 24, CostRate: 25, BillingRate: 75, Cost: 600, Revenue: 1800 },
      ],
    },
  ],
};

describe('GET /api/reports/cost-revenue', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    reportsBackend.getMonthlyCostRevenue.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET(requestWithQuery('?year=2025&month=3'));
    expect(response.status).toBe(401);
  });

  it('returns 403 for a plain User', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    const response = await GET(requestWithQuery('?year=2025&month=3'));
    expect(response.status).toBe(403);
  });

  it('returns 400 when year/month are missing', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    const response = await GET(requestWithQuery(''));
    expect(response.status).toBe(400);
  });

  it('returns 400 for an out-of-range month', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    const response = await GET(requestWithQuery('?year=2025&month=13'));
    expect(response.status).toBe(400);
  });

  it('generates the report for a ProjectAdmin, coercing year/month to numbers, and maps the response', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );
    reportsBackend.getMonthlyCostRevenue.mockResolvedValue(reportDto);

    const response = await GET(requestWithQuery('?year=2025&month=3'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(reportsBackend.getMonthlyCostRevenue).toHaveBeenCalledWith({ year: 2025, month: 3 }, expect.any(String));
    expect(body.report.currency.symbol).toBe('S$');
    expect(body.report.projects[0].totalRevenue).toBe(1800);
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    reportsBackend.getMonthlyCostRevenue.mockRejectedValue(new Error('network down'));

    const response = await GET(requestWithQuery('?year=2025&month=3'));
    expect(response.status).toBe(500);
  });
});
