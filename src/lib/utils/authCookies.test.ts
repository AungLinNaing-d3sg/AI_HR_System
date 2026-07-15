/**
 * @jest-environment node
 *
 * `next/server`'s `NextResponse`/`NextRequest` rely on the Web Fetch API
 * globals (Request/Response/Headers) that Node.js provides natively but the
 * jsdom test environment does not polyfill. Route-handler-adjacent helpers
 * like this one are server-only anyway, so the `node` environment is the
 * correct (and simplest) choice here.
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, setAuthCookies } from './authCookies';
import {
  ACCESS_TOKEN_COOKIE,
  DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
} from '@/lib/constants/auth.constants';

describe('setAuthCookies', () => {
  it('sets both cookies as httpOnly + SameSite=Strict', () => {
    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, 'access-token', 'refresh-token');

    const access = response.cookies.get(ACCESS_TOKEN_COOKIE);
    const refresh = response.cookies.get(REFRESH_TOKEN_COOKIE);

    expect(access?.value).toBe('access-token');
    expect(refresh?.value).toBe('refresh-token');
  });

  it('falls back to the default access-token max-age when none is provided', () => {
    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, 'access-token', 'refresh-token');

    const setCookieHeader = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : (response.headers.get('set-cookie') ?? '');
    const serialized = Array.isArray(setCookieHeader) ? setCookieHeader.join(';') : setCookieHeader;

    expect(serialized).toContain(`Max-Age=${DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS}`);
    expect(serialized).toContain(`Max-Age=${REFRESH_TOKEN_MAX_AGE_SECONDS}`);
  });

  it('uses a custom expiresInSeconds for the access token when provided', () => {
    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, 'access-token', 'refresh-token', 3600);

    const setCookieHeader = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : (response.headers.get('set-cookie') ?? '');
    const serialized = Array.isArray(setCookieHeader) ? setCookieHeader.join(';') : setCookieHeader;

    expect(serialized).toContain('Max-Age=3600');
  });

  it('ignores a non-positive expiresInSeconds and falls back to the default', () => {
    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, 'access-token', 'refresh-token', -5);

    const setCookieHeader = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : (response.headers.get('set-cookie') ?? '');
    const serialized = Array.isArray(setCookieHeader) ? setCookieHeader.join(';') : setCookieHeader;

    expect(serialized).toContain(`Max-Age=${DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS}`);
  });
});

describe('clearAuthCookies', () => {
  it('overwrites both auth cookies with an empty value and zero max-age', () => {
    const response = NextResponse.json({ ok: true });
    clearAuthCookies(response);

    const access = response.cookies.get(ACCESS_TOKEN_COOKIE);
    const refresh = response.cookies.get(REFRESH_TOKEN_COOKIE);

    expect(access?.value).toBe('');
    expect(refresh?.value).toBe('');

    const setCookieHeader = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : (response.headers.get('set-cookie') ?? '');
    const serialized = Array.isArray(setCookieHeader) ? setCookieHeader.join(';') : setCookieHeader;
    expect(serialized).toContain('Max-Age=0');
  });
});
