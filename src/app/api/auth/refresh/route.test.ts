/**
 * @jest-environment node
 */
import { REFRESH_TOKEN_COOKIE } from '@/lib/constants/auth.constants';

const mockCookieStore = {
  get: jest.fn(),
};

jest.mock('next/headers', () => ({
  cookies: () => Promise.resolve(mockCookieStore),
}));

jest.mock('../../../../lib/api/authBackend.api', () => ({
  refreshToken: jest.fn(),
}));

const authBackend = jest.requireMock('../../../../lib/api/authBackend.api') as { refreshToken: jest.Mock };

import { POST } from './route';

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    authBackend.refreshToken.mockReset();
  });

  it('returns 401 when there is no refresh-token cookie', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await POST();
    expect(response.status).toBe(401);
    expect(authBackend.refreshToken).not.toHaveBeenCalled();
  });

  it('sets new cookies on a successful refresh', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === REFRESH_TOKEN_COOKIE ? { value: 'old-refresh-token' } : undefined
    );
    authBackend.refreshToken.mockResolvedValue({
      AccessToken: 'new-access-token',
      RefreshToken: 'new-refresh-token',
      ExpiresIn: 900,
    });

    const response = await POST();
    expect(response.status).toBe(200);
    expect(authBackend.refreshToken).toHaveBeenCalledWith({ RefreshToken: 'old-refresh-token' });
    const setCookie = response.headers.getSetCookie().join(';');
    expect(setCookie).toContain('new-access-token');
  });

  it('clears cookies and returns 401 when the backend rejects the refresh token', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === REFRESH_TOKEN_COOKIE ? { value: 'expired-refresh-token' } : undefined
    );
    authBackend.refreshToken.mockRejectedValue(new Error('invalid_grant'));

    const response = await POST();
    expect(response.status).toBe(401);
    const setCookie = response.headers.getSetCookie().join(';');
    expect(setCookie).toContain('Max-Age=0');
  });
});
