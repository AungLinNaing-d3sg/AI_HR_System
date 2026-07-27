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

jest.mock('../../../../lib/api/countriesBackend.api', () => ({
  updateCountry: jest.fn(),
  deleteCountry: jest.fn(),
}));

const countriesBackend = jest.requireMock('../../../../lib/api/countriesBackend.api') as {
  updateCountry: jest.Mock;
  deleteCountry: jest.Mock;
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
  return new Request('https://example.com/api/countries/country-1', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

const countryDto = {
  Id: 'aa532dd2-1a51-4be0-b09b-be3d99ea15f3',
  Code: 'MM',
  Name: 'Union of Myanmar',
  CreatedAt: '2026-06-23T13:02:46Z',
  UpdatedAt: '2026-06-23T13:05:37Z',
};

describe('PUT /api/countries/:id', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    countriesBackend.updateCountry.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await PUT(makeRequest({}), makeParams('country-1'));
    expect(response.status).toBe(401);
    expect(countriesBackend.updateCountry).not.toHaveBeenCalled();
  });

  it('returns 403 when a non-SystemAdmin tries to update a country', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );

    const response = await PUT(makeRequest({ name: 'Union of Myanmar' }), makeParams('country-1'));

    expect(response.status).toBe(403);
    expect(countriesBackend.updateCountry).not.toHaveBeenCalled();
  });

  it('returns 400 when the payload fails validation', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );

    const response = await PUT(makeRequest({ name: '' }), makeParams('country-1'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors).toBeDefined();
    expect(countriesBackend.updateCountry).not.toHaveBeenCalled();
  });

  it('updates the country and returns 200 with the normalized country', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    countriesBackend.updateCountry.mockResolvedValue(countryDto);

    const response = await PUT(makeRequest({ name: 'Union of Myanmar' }), makeParams('country-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.country.name).toBe('Union of Myanmar');
    expect(countriesBackend.updateCountry).toHaveBeenCalledWith(
      'country-1',
      { Name: 'Union of Myanmar' },
      expect.any(String)
    );
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    countriesBackend.updateCountry.mockRejectedValue(new Error('network down'));

    const response = await PUT(makeRequest({ name: 'Union of Myanmar' }), makeParams('country-1'));
    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/countries/:id', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    countriesBackend.deleteCountry.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await DELETE(new Request('https://example.com/api/countries/country-1'), makeParams('country-1'));
    expect(response.status).toBe(401);
    expect(countriesBackend.deleteCountry).not.toHaveBeenCalled();
  });

  it('returns 403 when a non-SystemAdmin tries to delete a country', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );

    const response = await DELETE(new Request('https://example.com/api/countries/country-1'), makeParams('country-1'));

    expect(response.status).toBe(403);
    expect(countriesBackend.deleteCountry).not.toHaveBeenCalled();
  });

  it('deletes the country and returns 200', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    countriesBackend.deleteCountry.mockResolvedValue(undefined);

    const response = await DELETE(new Request('https://example.com/api/countries/country-1'), makeParams('country-1'));
    expect(response.status).toBe(200);
    expect(countriesBackend.deleteCountry).toHaveBeenCalledWith('country-1', expect.any(String));
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    countriesBackend.deleteCountry.mockRejectedValue(new Error('network down'));

    const response = await DELETE(new Request('https://example.com/api/countries/country-1'), makeParams('country-1'));
    expect(response.status).toBe(500);
  });
});
