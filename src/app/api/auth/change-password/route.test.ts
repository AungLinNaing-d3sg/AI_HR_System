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

jest.mock('../../../../lib/api/authBackend.api', () => ({
  changePassword: jest.fn(),
}));

const authBackend = jest.requireMock('../../../../lib/api/authBackend.api') as { changePassword: jest.Mock };

import { PUT } from './route';

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

function tokenFor(role: string): string {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ role, exp: futureExp });
}

function jsonRequest(body: unknown): Request {
  return new Request('https://example.com/api/auth/change-password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  currentPassword: 'OldPass@123',
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

describe('PUT /api/auth/change-password', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    authBackend.changePassword.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await PUT(jsonRequest(validPayload));
    expect(response.status).toBe(401);
    expect(authBackend.changePassword).not.toHaveBeenCalled();
  });

  it('returns 400 when the payload fails validation', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );

    const response = await PUT(jsonRequest({ ...validPayload, confirmNewPassword: 'Mismatch@123' }));
    expect(response.status).toBe(400);
    expect(authBackend.changePassword).not.toHaveBeenCalled();
  });

  it('returns success when the backend confirms the change', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    authBackend.changePassword.mockResolvedValue(undefined);

    const response = await PUT(jsonRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('does NOT report success when the current password is wrong (IsSuccess: false from the backend)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    // Mirrors what backendClient's response interceptor throws when the backend
    // responds 200 with {IsSuccess: false} - see lib/api/backendClient.ts. This
    // is the regression test for the bug where a wrong current password still
    // showed a success message.
    authBackend.changePassword.mockRejectedValue(
      new AxiosError(
        'Current password is incorrect.',
        AxiosError.ERR_BAD_RESPONSE,
        undefined,
        undefined,
        {
          status: 400,
          statusText: 'Bad Request',
          headers: {},
          config: {} as never,
          data: { StatusCode: 400, IsSuccess: false, Message: 'Current password is incorrect.', Data: null },
        }
      )
    );

    const response = await PUT(jsonRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBeUndefined();
    expect(body.message).toBe('Current password is incorrect.');
  });

  it('returns a normalized error when the backend call fails for an unrelated reason', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    authBackend.changePassword.mockRejectedValue(new Error('network down'));

    const response = await PUT(jsonRequest(validPayload));
    expect(response.status).toBe(500);
  });
});
