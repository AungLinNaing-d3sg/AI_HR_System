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

jest.mock('../../../../lib/api/exchangeRatesBackend.api', () => ({
  updateExchangeRate: jest.fn(),
  deleteExchangeRate: jest.fn(),
}));

const exchangeRatesBackend = jest.requireMock('../../../../lib/api/exchangeRatesBackend.api') as {
  updateExchangeRate: jest.Mock;
  deleteExchangeRate: jest.Mock;
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
  return new Request('https://example.com/api/exchange-rates/rate-1', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

const mutationDto = {
  Id: 'rate-1',
  FromCurrencyId: 'currency-1',
  ToCurrencyId: 'currency-2',
  Rate: 0.8,
  EffectiveDate: '2025-02-01',
  IsActive: true,
};

describe('PUT /api/exchange-rates/:id', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    exchangeRatesBackend.updateExchangeRate.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await PUT(makeRequest({}), makeParams('rate-1'));
    expect(response.status).toBe(401);
    expect(exchangeRatesBackend.updateExchangeRate).not.toHaveBeenCalled();
  });

  it('returns 403 when a non-SystemAdmin tries to update an exchange rate', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );

    const response = await PUT(
      makeRequest({ rate: 0.8, effectiveDate: '2025-02-01', isActive: true }),
      makeParams('rate-1')
    );

    expect(response.status).toBe(403);
    expect(exchangeRatesBackend.updateExchangeRate).not.toHaveBeenCalled();
  });

  it('returns 400 when the payload fails validation', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );

    const response = await PUT(makeRequest({ rate: '', effectiveDate: '', isActive: true }), makeParams('rate-1'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors).toBeDefined();
    expect(exchangeRatesBackend.updateExchangeRate).not.toHaveBeenCalled();
  });

  it('updates the exchange rate and returns 200 with the normalized result', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    exchangeRatesBackend.updateExchangeRate.mockResolvedValue(mutationDto);

    const response = await PUT(
      makeRequest({ rate: 0.8, effectiveDate: '2025-02-01', isActive: true }),
      makeParams('rate-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.exchangeRate.rate).toBe(0.8);
    expect(exchangeRatesBackend.updateExchangeRate).toHaveBeenCalledWith(
      'rate-1',
      { Rate: 0.8, EffectiveDate: '2025-02-01', IsActive: true },
      expect.any(String)
    );
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    exchangeRatesBackend.updateExchangeRate.mockRejectedValue(new Error('network down'));

    const response = await PUT(
      makeRequest({ rate: 0.8, effectiveDate: '2025-02-01', isActive: true }),
      makeParams('rate-1')
    );
    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/exchange-rates/:id', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    exchangeRatesBackend.deleteExchangeRate.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await DELETE(new Request('https://example.com/api/exchange-rates/rate-1'), makeParams('rate-1'));
    expect(response.status).toBe(401);
    expect(exchangeRatesBackend.deleteExchangeRate).not.toHaveBeenCalled();
  });

  it('returns 403 when a non-SystemAdmin tries to delete an exchange rate', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );

    const response = await DELETE(new Request('https://example.com/api/exchange-rates/rate-1'), makeParams('rate-1'));

    expect(response.status).toBe(403);
    expect(exchangeRatesBackend.deleteExchangeRate).not.toHaveBeenCalled();
  });

  it('deletes the exchange rate and returns 200', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    exchangeRatesBackend.deleteExchangeRate.mockResolvedValue(undefined);

    const response = await DELETE(new Request('https://example.com/api/exchange-rates/rate-1'), makeParams('rate-1'));
    expect(response.status).toBe(200);
    expect(exchangeRatesBackend.deleteExchangeRate).toHaveBeenCalledWith('rate-1', expect.any(String));
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    exchangeRatesBackend.deleteExchangeRate.mockRejectedValue(new Error('network down'));

    const response = await DELETE(new Request('https://example.com/api/exchange-rates/rate-1'), makeParams('rate-1'));
    expect(response.status).toBe(500);
  });
});
