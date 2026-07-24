import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as authBackend from '@/lib/api/authBackend.api';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { clearAuthCookies, setAuthCookies, setRequestAuthCookies } from '@/lib/utils/authCookies';
import { decodeAccessToken, extractRole, isTokenExpired, secondsUntilExpiry } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { resolveRouteAccess } from '@/lib/utils/routeAccess';

/**
 * Route protection + silent token refresh for the routes matched below.
 *
 * `middleware.ts` is deprecated in this Next.js version in favor of
 * `proxy.ts` (see node_modules/next/dist/docs/01-app/03-api-reference/
 * 03-file-conventions/proxy.md) - the file/function/export shape is the
 * same, just renamed.
 *
 * This intentionally only guards the routes this feature owns
 * (`/dashboard`, `/profile`, `/admin/users/create`, `/admin/currencies`,
 * `/admin/exchange-rates`, `/admin/rate-cards`, `/admin/countries`,
 * `/projects`, `/timesheets`, `/reports`, `/invoices`) rather than acting as
 * a blanket catch-all, so unrelated existing routes (e.g. `/login`,
 * `/forbidden`) are left untouched.
 */
function buildLoginRedirect(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
  const response = NextResponse.redirect(loginUrl);
  clearAuthCookies(response);
  return response;
}

function buildForbiddenRedirect(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL('/forbidden', request.url));
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshTokenValue = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  const decision = resolveRouteAccess({
    pathname,
    hasAccessToken: Boolean(accessToken),
    isAccessTokenExpired: isTokenExpired(claims),
    hasRefreshToken: Boolean(refreshTokenValue),
    role: extractRole(claims),
  });

  if (decision.type === 'allow') {
    return NextResponse.next();
  }

  if (decision.type === 'redirect') {
    return decision.destination === 'login' ? buildLoginRedirect(request) : buildForbiddenRedirect(request);
  }

  // decision.type === 'refresh': attempt a silent token refresh so an
  // otherwise-valid session doesn't force the user back to /login just
  // because their short-lived access token expired.
  try {
    if (!refreshTokenValue) {
      return buildLoginRedirect(request);
    }

    const refreshed = await authBackend.refreshToken({ RefreshToken: refreshTokenValue });
    const refreshedClaims = decodeAccessToken(refreshed.AccessToken);

    const postRefreshDecision = resolveRouteAccess({
      pathname,
      hasAccessToken: true,
      isAccessTokenExpired: false,
      hasRefreshToken: true,
      role: extractRole(refreshedClaims),
    });

    if (postRefreshDecision.type === 'redirect') {
      return postRefreshDecision.destination === 'login'
        ? buildLoginRedirect(request)
        : buildForbiddenRedirect(request);
    }

    setRequestAuthCookies(request, refreshed.AccessToken, refreshed.RefreshToken);
    const response = NextResponse.next({ request });
    setAuthCookies(response, refreshed.AccessToken, refreshed.RefreshToken, secondsUntilExpiry(refreshedClaims));
    return response;
  } catch (error) {
    logger.warn('Silent token refresh failed in proxy', error);
    return buildLoginRedirect(request);
  }
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/profile',
    '/profile/:path*',
    '/admin/users/create',
    '/admin/users/create/:path*',
    '/admin/currencies',
    '/admin/currencies/:path*',
    '/admin/exchange-rates',
    '/admin/exchange-rates/:path*',
    '/admin/rate-cards',
    '/admin/rate-cards/:path*',
    '/admin/countries',
    '/admin/countries/:path*',
    '/projects',
    '/projects/:path*',
    '/timesheets',
    '/timesheets/:path*',
    '/reports',
    '/reports/:path*',
    '/invoices',
    '/invoices/:path*',
  ],
};
