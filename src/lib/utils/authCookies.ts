import 'server-only';

import type { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
} from '@/lib/constants/auth.constants';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Sets the access/refresh token cookies as httpOnly + Secure + SameSite=Strict,
 * per the security requirements in the Technical Requirements doc. Tokens
 * are never exposed to client-side JavaScript or persisted in
 * localStorage/sessionStorage.
 *
 * `secure` is tied to NODE_ENV rather than hardcoded `true` so the cookie is
 * still usable during local HTTP development; deployments must run behind
 * HTTPS in every environment where `NODE_ENV=production`.
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  expiresInSeconds?: number
): void {
  const accessTokenMaxAge =
    typeof expiresInSeconds === 'number' && expiresInSeconds > 0
      ? expiresInSeconds
      : DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS;

  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: accessTokenMaxAge,
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
}

/**
 * Updates the *incoming request's* cookie jar with a freshly-refreshed
 * token pair, in addition to `setAuthCookies` writing them onto the
 * outgoing response.
 *
 * This matters for `proxy.ts`'s silent-refresh path specifically: when a
 * request continues past Proxy via `NextResponse.next({ request })`, any
 * Server Component/Route Handler further down the request pipeline reads
 * cookies off that forwarded `request`, not off the eventual response (the
 * browser hasn't stored the new `Set-Cookie` yet). Without this, a page
 * rendered immediately after a silent refresh would still see the old,
 * expired access token.
 */
export function setRequestAuthCookies(
  request: NextRequest,
  accessToken: string,
  refreshToken: string
): void {
  request.cookies.set(ACCESS_TOKEN_COOKIE, accessToken);
  request.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken);
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}
