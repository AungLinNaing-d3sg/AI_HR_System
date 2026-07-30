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

jest.mock('../../../../lib/api/currenciesBackend.api', () => ({
  updateCurrency: jest.fn(),
  deleteCurrency: jest.fn(),
}));

const currenciesBackend = jest.requireMock('../../../../lib/api/currenciesBackend.api') as {
  updateCurrency: jest.Mock;
  deleteCurrency: jest.Mock;
};

import { PUT, DELETE } from './route';

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

function tokenFor(role: string): string {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ role, exp: futureExp });
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(body: unknown): Request {
  return new Request('https://example.com/api/currencies/currency-1', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

const currencyDto = {
  Id: 'currency-1',
  Code: 'SGD',
  Name: 'Singapore Dollar',
  Symbol: 'SGD',
  IsBaseCurrency: true,
  IsActive: true,
  CreatedAt: '2026-06-11T10:14:31Z',
  UpdatedAt: '2026-06-23T13:24:01Z',
};

// These route handlers intentionally exercise failure paths that call
// `logger.error` (see lib/utils/logger.ts), which forwards to the real
// console. Silence it here so negative-path test runs stay noise-free,
// without masking genuinely unexpected console output.
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('PUT /api/currencies/:id', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    currenciesBackend.updateCurrency.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await PUT(makeRequest({}), makeParams('currency-1'));
    expect(response.status).toBe(401);
    expect(currenciesBackend.updateCurrency).not.toHaveBeenCalled();
  });

  it('returns 403 when a non-SystemAdmin tries to update a currency', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );

    const response = await PUT(
      makeRequest({ name: 'Singapore Dollar', symbol: 'SGD', isActive: true }),
      makeParams('currency-1')
    );

    expect(response.status).toBe(403);
    expect(currenciesBackend.updateCurrency).not.toHaveBeenCalled();
  });

  it('returns 400 when the payload fails validation', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );

    const response = await PUT(makeRequest({ name: '', symbol: '', isActive: true }), makeParams('currency-1'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors).toBeDefined();
    expect(currenciesBackend.updateCurrency).not.toHaveBeenCalled();
  });

  it('updates the currency and returns 200 with the normalized currency', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    currenciesBackend.updateCurrency.mockResolvedValue(currencyDto);

    const response = await PUT(
      makeRequest({ name: 'Singapore Dollar', symbol: 'SGD', isActive: true }),
      makeParams('currency-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.currency.symbol).toBe('SGD');
    expect(currenciesBackend.updateCurrency).toHaveBeenCalledWith(
      'currency-1',
      { Name: 'Singapore Dollar', Symbol: 'SGD', IsActive: true },
      expect.any(String)
    );
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    currenciesBackend.updateCurrency.mockRejectedValue(new Error('network down'));

    const response = await PUT(
      makeRequest({ name: 'Singapore Dollar', symbol: 'SGD', isActive: true }),
      makeParams('currency-1')
    );
    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/currencies/:id', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    currenciesBackend.deleteCurrency.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await DELETE(new Request('https://example.com/api/currencies/currency-1'), makeParams('currency-1'));
    expect(response.status).toBe(401);
    expect(currenciesBackend.deleteCurrency).not.toHaveBeenCalled();
  });

  it('returns 403 when a non-SystemAdmin tries to delete a currency', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );

    const response = await DELETE(new Request('https://example.com/api/currencies/currency-1'), makeParams('currency-1'));

    expect(response.status).toBe(403);
    expect(currenciesBackend.deleteCurrency).not.toHaveBeenCalled();
  });

  it('deletes the currency and returns 200', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    currenciesBackend.deleteCurrency.mockResolvedValue(undefined);

    const response = await DELETE(new Request('https://example.com/api/currencies/currency-1'), makeParams('currency-1'));
    expect(response.status).toBe(200);
    expect(currenciesBackend.deleteCurrency).toHaveBeenCalledWith('currency-1', expect.any(String));
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    currenciesBackend.deleteCurrency.mockRejectedValue(new Error('network down'));

    const response = await DELETE(new Request('https://example.com/api/currencies/currency-1'), makeParams('currency-1'));
    expect(response.status).toBe(500);
  });
});
