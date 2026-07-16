/**
 * @jest-environment node
 *
 * See src/lib/utils/authCookies.test.ts for why `node` is required here:
 * `NextRequest`/`NextResponse` need Web Fetch API globals jsdom doesn't
 * provide.
 */
import { NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/constants/auth.constants';

jest.mock('./lib/api/authBackend.api', () => ({
  refreshToken: jest.fn(),
}));

const authBackend = jest.requireMock('./lib/api/authBackend.api') as {
  refreshToken: jest.Mock;
};

import { proxy } from './proxy';

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

describe('proxy', () => {
  beforeEach(() => {
    authBackend.refreshToken.mockReset();
  });

  it('allows a request with a valid, non-expired access token', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeToken({ role: 'User', exp: futureExp });
    const request = new NextRequest('https://example.com/profile', {
      headers: { cookie: `${ACCESS_TOKEN_COOKIE}=${token}` },
    });

    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(authBackend.refreshToken).not.toHaveBeenCalled();
  });

  it('redirects to /login when there is no access or refresh token', async () => {
    const request = new NextRequest('https://example.com/profile');

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });

  it('redirects to /forbidden when a non-admin hits the SystemAdmin-only route', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeToken({ role: 'User', exp: futureExp });
    const request = new NextRequest('https://example.com/admin/users/create', {
      headers: { cookie: `${ACCESS_TOKEN_COOKIE}=${token}` },
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/forbidden');
  });

  it('redirects to /forbidden when a plain User hits /projects', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeToken({ role: 'User', exp: futureExp });
    const request = new NextRequest('https://example.com/projects', {
      headers: { cookie: `${ACCESS_TOKEN_COOKIE}=${token}` },
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/forbidden');
  });

  it('allows a ProjectAdmin to reach /projects', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeToken({ role: 'ProjectAdmin', exp: futureExp });
    const request = new NextRequest('https://example.com/projects', {
      headers: { cookie: `${ACCESS_TOKEN_COOKIE}=${token}` },
    });

    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it('silently refreshes an expired access token and allows the request through', async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 60;
    const expiredToken = makeToken({ role: 'User', exp: pastExp });
    const newToken = makeToken({ role: 'User', exp: Math.floor(Date.now() / 1000) + 3600 });

    authBackend.refreshToken.mockResolvedValue({
      AccessToken: newToken,
      RefreshToken: 'new-refresh-token',
      ExpiresIn: 900,
    });

    const request = new NextRequest('https://example.com/profile', {
      headers: {
        cookie: `${ACCESS_TOKEN_COOKIE}=${expiredToken}; ${REFRESH_TOKEN_COOKIE}=old-refresh-token`,
      },
    });

    const response = await proxy(request);

    expect(authBackend.refreshToken).toHaveBeenCalledWith({ RefreshToken: 'old-refresh-token' });
    expect(response.status).toBe(200);
    const setCookieHeader = response.headers.getSetCookie
      ? response.headers.getSetCookie().join(';')
      : (response.headers.get('set-cookie') ?? '');
    expect(setCookieHeader).toContain(newToken);
  });

  it('redirects to /login when the refresh token is rejected by the backend', async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 60;
    const expiredToken = makeToken({ role: 'User', exp: pastExp });

    authBackend.refreshToken.mockRejectedValue(new Error('invalid_grant'));

    const request = new NextRequest('https://example.com/profile', {
      headers: {
        cookie: `${ACCESS_TOKEN_COOKIE}=${expiredToken}; ${REFRESH_TOKEN_COOKIE}=old-refresh-token`,
      },
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });
});
