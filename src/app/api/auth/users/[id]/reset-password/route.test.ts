/**
 * @jest-environment node
 */
import { AxiosError } from 'axios';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';

const mockCookieStore = {
  get: jest.fn(),
};

jest.mock('next/headers', () => ({
  cookies: () => Promise.resolve(mockCookieStore),
}));

jest.mock('../../../../../../lib/api/authBackend.api', () => ({
  resetPassword: jest.fn(),
}));

const authBackend = jest.requireMock('../../../../../../lib/api/authBackend.api') as {
  resetPassword: jest.Mock;
};

import { PUT } from './route';

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
  return new Request('https://example.com/api/auth/users/user-2/reset-password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  newPassword: 'NewPass@123',
  confirmNewPassword: 'NewPass@123',
};

// This route handler intentionally exercises failure paths that call
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

describe('PUT /api/auth/users/:id/reset-password', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    authBackend.resetPassword.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await PUT(makeRequest(validPayload), makeParams('user-2'));
    expect(response.status).toBe(401);
    expect(authBackend.resetPassword).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller is not a SystemAdmin', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );

    const response = await PUT(makeRequest(validPayload), makeParams('user-2'));
    expect(response.status).toBe(403);
    expect(authBackend.resetPassword).not.toHaveBeenCalled();
  });

  it('returns 400 when the payload fails validation (mismatched confirmation)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );

    const response = await PUT(
      makeRequest({ ...validPayload, confirmNewPassword: 'Mismatch@123' }),
      makeParams('user-2')
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors).toBeDefined();
    expect(authBackend.resetPassword).not.toHaveBeenCalled();
  });

  it('returns 400 when the new password fails the complexity policy', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );

    const response = await PUT(
      makeRequest({ newPassword: 'weakpassword', confirmNewPassword: 'weakpassword' }),
      makeParams('user-2')
    );

    expect(response.status).toBe(400);
    expect(authBackend.resetPassword).not.toHaveBeenCalled();
  });

  it('resets the password and returns 200 on success', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    authBackend.resetPassword.mockResolvedValue(undefined);

    const response = await PUT(makeRequest(validPayload), makeParams('user-2'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(authBackend.resetPassword).toHaveBeenCalledWith(
      'user-2',
      { NewPassword: 'NewPass@123', ConfirmNewPassword: 'NewPass@123' },
      expect.any(String)
    );
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    authBackend.resetPassword.mockRejectedValue(new Error('network down'));

    const response = await PUT(makeRequest(validPayload), makeParams('user-2'));
    expect(response.status).toBe(500);
  });

  it('surfaces the backend’s real error message instead of crashing', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    authBackend.resetPassword.mockRejectedValue(
      new AxiosError('Bad Request', AxiosError.ERR_BAD_RESPONSE, undefined, undefined, {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as never,
        data: { StatusCode: 400, IsSuccess: false, Message: 'User not found.', Data: null },
      })
    );

    const response = await PUT(makeRequest(validPayload), makeParams('user-2'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe('User not found.');
  });
});
