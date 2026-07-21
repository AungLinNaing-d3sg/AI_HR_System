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

jest.mock('../../../lib/api/currenciesBackend.api', () => ({
  getAllCurrencies: jest.fn(),
}));

const currenciesBackend = jest.requireMock('../../../lib/api/currenciesBackend.api') as {
  getAllCurrencies: jest.Mock;
};

import { GET } from './route';

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

function tokenFor(role: string): string {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ role, exp: futureExp });
}

const currencyDto = {
  Id: 'currency-1',
  Code: 'SGD',
  Name: 'Singapore Dollar',
  Symbol: 'S$',
  IsBaseCurrency: true,
  IsActive: true,
  CreatedAt: '2026-06-11T10:14:31Z',
};

describe('GET /api/currencies', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    currenciesBackend.getAllCurrencies.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(currenciesBackend.getAllCurrencies).not.toHaveBeenCalled();
  });

  it('allows a plain User to view currencies (reference data, no role restriction)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    currenciesBackend.getAllCurrencies.mockResolvedValue({ Items: [currencyDto], TotalCount: 1, Page: 1, PageSize: 100 });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.currencies).toHaveLength(1);
    expect(body.currencies[0].code).toBe('SGD');
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    currenciesBackend.getAllCurrencies.mockRejectedValue(new Error('network down'));

    const response = await GET();
    expect(response.status).toBe(500);
  });
});
