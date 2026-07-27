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

jest.mock('../../../lib/api/countriesBackend.api', () => ({
  getAllCountries: jest.fn(),
  createCountry: jest.fn(),
}));

const countriesBackend = jest.requireMock('../../../lib/api/countriesBackend.api') as {
  getAllCountries: jest.Mock;
  createCountry: jest.Mock;
};

import { GET, POST } from './route';

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

function tokenFor(role: string): string {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ role, exp: futureExp });
}

function makeRequest(body: unknown): Request {
  return new Request('https://example.com/api/countries', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function makeGetRequest(query = ''): Request {
  return new Request(`https://example.com/api/countries${query}`);
}

const countryDto = {
  Id: '22222222-2222-2222-2222-222222222201',
  Code: 'SG',
  Name: 'Singapore',
  CreatedAt: '2026-06-11T10:14:31Z',
};

describe('GET /api/countries', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    countriesBackend.getAllCountries.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET(makeGetRequest());
    expect(response.status).toBe(401);
    expect(countriesBackend.getAllCountries).not.toHaveBeenCalled();
  });

  it('allows a plain User to view countries (reference data, no role restriction)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    countriesBackend.getAllCountries.mockResolvedValue({ Items: [countryDto], TotalCount: 1, Page: 1, PageSize: 100 });

    const response = await GET(makeGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.countries).toHaveLength(1);
    expect(body.countries[0].code).toBe('SG');
    expect(body.totalCount).toBe(1);
  });

  it('forwards pageNo/pageSize query params to the backend', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    countriesBackend.getAllCountries.mockResolvedValue({ Items: [countryDto], TotalCount: 1, Page: 2, PageSize: 5 });

    await GET(makeGetRequest('?pageNo=2&pageSize=5'));

    expect(countriesBackend.getAllCountries).toHaveBeenCalledWith(expect.any(String), { page: 2, pageSize: 5 });
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    countriesBackend.getAllCountries.mockRejectedValue(new Error('network down'));

    const response = await GET(makeGetRequest());
    expect(response.status).toBe(500);
  });
});

describe('POST /api/countries', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    countriesBackend.createCountry.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(401);
    expect(countriesBackend.createCountry).not.toHaveBeenCalled();
  });

  it('returns 403 when a non-SystemAdmin tries to create a country', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );

    const response = await POST(makeRequest({ code: 'MM', name: 'Myanmar' }));

    expect(response.status).toBe(403);
    expect(countriesBackend.createCountry).not.toHaveBeenCalled();
  });

  it('returns 400 when the payload fails validation', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );

    const response = await POST(makeRequest({ code: '', name: '' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors).toBeDefined();
    expect(countriesBackend.createCountry).not.toHaveBeenCalled();
  });

  it('creates the country and returns 201 with the normalized country', async () => {
    const token = tokenFor('SystemAdmin');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    countriesBackend.createCountry.mockResolvedValue({
      Id: 'aa532dd2-1a51-4be0-b09b-be3d99ea15f3',
      Code: 'MM',
      Name: 'Myanmar',
      CreatedAt: '2026-06-23T13:02:45Z',
    });

    const response = await POST(makeRequest({ code: 'mm', name: 'Myanmar' }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.country.code).toBe('MM');
    expect(countriesBackend.createCountry).toHaveBeenCalledWith({ Code: 'MM', Name: 'Myanmar' }, token);
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    countriesBackend.createCountry.mockRejectedValue(new Error('network down'));

    const response = await POST(makeRequest({ code: 'MM', name: 'Myanmar' }));
    expect(response.status).toBe(500);
  });
});
