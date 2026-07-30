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

jest.mock('../../../lib/api/exchangeRatesBackend.api', () => ({
  getAllExchangeRates: jest.fn(),
  createExchangeRate: jest.fn(),
}));

jest.mock('../../../lib/api/currenciesBackend.api', () => ({
  getAllCurrencies: jest.fn(),
}));

const exchangeRatesBackend = jest.requireMock('../../../lib/api/exchangeRatesBackend.api') as {
  getAllExchangeRates: jest.Mock;
  createExchangeRate: jest.Mock;
};

const currenciesBackend = jest.requireMock('../../../lib/api/currenciesBackend.api') as {
  getAllCurrencies: jest.Mock;
};

import { GET, POST } from './route';

function makeRequest(body: unknown): Request {
  return new Request('https://example.com/api/exchange-rates', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function makeGetRequest(query = ''): Request {
  return new Request(`https://example.com/api/exchange-rates${query}`);
}

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

function tokenFor(role: string): string {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ role, exp: futureExp });
}

const exchangeRateDto = {
  Id: 'rate-1',
  FromCurrency: { Id: 'currency-1', Code: 'SGD', Symbol: 'S$' },
  ToCurrency: { Id: 'currency-2', Code: 'USD', Symbol: '$' },
  Rate: 0.74,
  EffectiveDate: '2025-01-01',
  IsActive: true,
  CreatedAt: '2026-06-22T12:44:02Z',
};

const currencies = [
  { Id: 'currency-1', Code: 'SGD', Name: 'Singapore Dollar', Symbol: 'S$', IsBaseCurrency: true, IsActive: true, CreatedAt: '2026-01-01T00:00:00Z' },
  { Id: 'currency-2', Code: 'USD', Name: 'US Dollar', Symbol: '$', IsBaseCurrency: false, IsActive: true, CreatedAt: '2026-01-01T00:00:00Z' },
];

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

describe('GET /api/exchange-rates', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    exchangeRatesBackend.getAllExchangeRates.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET(makeGetRequest());
    expect(response.status).toBe(401);
    expect(exchangeRatesBackend.getAllExchangeRates).not.toHaveBeenCalled();
  });

  it('allows a plain User to view exchange rates (reference data, no role restriction)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    exchangeRatesBackend.getAllExchangeRates.mockResolvedValue({
      Items: [exchangeRateDto],
      TotalCount: 1,
      Page: 1,
      PageSize: 100,
    });

    const response = await GET(makeGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.exchangeRates).toHaveLength(1);
    expect(body.exchangeRates[0].toCurrency.code).toBe('USD');
    expect(body.totalCount).toBe(1);
  });

  it('forwards pageNo/pageSize/fromCurrencyId query params to the backend', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    exchangeRatesBackend.getAllExchangeRates.mockResolvedValue({
      Items: [exchangeRateDto],
      TotalCount: 1,
      Page: 2,
      PageSize: 5,
    });

    await GET(makeGetRequest('?pageNo=2&pageSize=5&fromCurrencyId=currency-1'));

    expect(exchangeRatesBackend.getAllExchangeRates).toHaveBeenCalledWith(expect.any(String), {
      page: 2,
      pageSize: 5,
      fromCurrencyId: 'currency-1',
    });
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    exchangeRatesBackend.getAllExchangeRates.mockRejectedValue(new Error('network down'));

    const response = await GET(makeGetRequest());
    expect(response.status).toBe(500);
  });
});

describe('POST /api/exchange-rates', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    exchangeRatesBackend.createExchangeRate.mockReset();
    currenciesBackend.getAllCurrencies.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(401);
    expect(exchangeRatesBackend.createExchangeRate).not.toHaveBeenCalled();
  });

  it('returns 403 when a non-SystemAdmin tries to create an exchange rate', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );

    const response = await POST(
      makeRequest({ toCurrencyId: 'currency-2', rate: 0.74, effectiveDate: '2025-01-01', isActive: true })
    );

    expect(response.status).toBe(403);
    expect(exchangeRatesBackend.createExchangeRate).not.toHaveBeenCalled();
  });

  it('returns 400 when the payload fails validation', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );

    const response = await POST(makeRequest({ toCurrencyId: '', rate: '', effectiveDate: '', isActive: true }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors).toBeDefined();
    expect(exchangeRatesBackend.createExchangeRate).not.toHaveBeenCalled();
  });

  it('returns 409 when no base currency is configured', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    currenciesBackend.getAllCurrencies.mockResolvedValue({
      Items: currencies.map((currency) => ({ ...currency, IsBaseCurrency: false })),
      TotalCount: 2,
      Page: 1,
      PageSize: 100,
    });

    const response = await POST(
      makeRequest({ toCurrencyId: 'currency-2', rate: 0.74, effectiveDate: '2025-01-01', isActive: true })
    );

    expect(response.status).toBe(409);
    expect(exchangeRatesBackend.createExchangeRate).not.toHaveBeenCalled();
  });

  it('returns 400 when the target currency is the base currency itself', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    currenciesBackend.getAllCurrencies.mockResolvedValue({ Items: currencies, TotalCount: 2, Page: 1, PageSize: 100 });

    const response = await POST(
      makeRequest({ toCurrencyId: 'currency-1', rate: 0.74, effectiveDate: '2025-01-01', isActive: true })
    );

    expect(response.status).toBe(400);
    expect(exchangeRatesBackend.createExchangeRate).not.toHaveBeenCalled();
  });

  it('creates the exchange rate FROM the resolved base currency and returns 201', async () => {
    const token = tokenFor('SystemAdmin');
    mockCookieStore.get.mockImplementation((name: string) => (name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined));
    currenciesBackend.getAllCurrencies.mockResolvedValue({ Items: currencies, TotalCount: 2, Page: 1, PageSize: 100 });
    exchangeRatesBackend.createExchangeRate.mockResolvedValue({
      Id: 'rate-1',
      FromCurrencyId: 'currency-1',
      ToCurrencyId: 'currency-2',
      Rate: 0.74,
      EffectiveDate: '2025-01-01',
      IsActive: true,
    });

    const response = await POST(
      makeRequest({ toCurrencyId: 'currency-2', rate: 0.74, effectiveDate: '2025-01-01', isActive: true })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.exchangeRate.fromCurrencyId).toBe('currency-1');
    expect(exchangeRatesBackend.createExchangeRate).toHaveBeenCalledWith(
      { FromCurrencyId: 'currency-1', ToCurrencyId: 'currency-2', Rate: 0.74, EffectiveDate: '2025-01-01', IsActive: true },
      token
    );
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    currenciesBackend.getAllCurrencies.mockResolvedValue({ Items: currencies, TotalCount: 2, Page: 1, PageSize: 100 });
    exchangeRatesBackend.createExchangeRate.mockRejectedValue(new Error('network down'));

    const response = await POST(
      makeRequest({ toCurrencyId: 'currency-2', rate: 0.74, effectiveDate: '2025-01-01', isActive: true })
    );
    expect(response.status).toBe(500);
  });
});
