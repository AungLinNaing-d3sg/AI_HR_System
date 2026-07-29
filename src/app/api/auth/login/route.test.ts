/**
 * @jest-environment node
 */
jest.mock('../../../../lib/api/authBackend.api', () => ({
  login: jest.fn(),
}));

const authBackend = jest.requireMock('../../../../lib/api/authBackend.api') as { login: jest.Mock };

import { POST } from './route';

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

function jsonRequest(body: unknown): Request {
  return new Request('https://example.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeAccessToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    authBackend.login.mockReset();
  });

  it('rejects an invalid payload before calling the backend', async () => {
    const response = await POST(jsonRequest({ usernameOrEmail: '', password: '' }));
    expect(response.status).toBe(400);
    expect(authBackend.login).not.toHaveBeenCalled();
  });

  it('sets httpOnly cookies and returns only the mapped user on success', async () => {
    const accessToken = makeAccessToken({
      role: 'User',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    authBackend.login.mockResolvedValue({
      AccessToken: accessToken,
      RefreshToken: 'refresh-token',
      ExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      UserId: 'user-1',
      Username: 'jdoe',
      Email: 'jdoe@example.com',
      FirstName: 'Jane',
      LastName: 'Doe',
      Roles: ['User'],
    });

    const response = await POST(jsonRequest({ usernameOrEmail: 'jdoe', password: 'Password@123' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user).toEqual({
      id: 'user-1',
      username: 'jdoe',
      email: 'jdoe@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      employeeId: null,
      countryId: null,
      role: 'User',
    });
    expect(body.user.accessToken).toBeUndefined();

    const setCookie = response.headers.getSetCookie().join(';');
    expect(setCookie).toContain(accessToken);
    expect(setCookie).toContain('HttpOnly');
  });

  it('returns 401 with the backend message when credentials are rejected', async () => {
    const { AxiosError, AxiosHeaders } = await import('axios');
    authBackend.login.mockRejectedValue(
      new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 401,
        statusText: '',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
        data: { Message: 'Invalid username/email or password.' },
      })
    );

    const response = await POST(jsonRequest({ usernameOrEmail: 'jdoe', password: 'wrong-Password@1' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toBe('Invalid username/email or password.');
  });

  it('returns 400 for a malformed JSON body', async () => {
    const request = new Request('https://example.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json',
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
