import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as authBackend from '@/lib/api/authBackend.api';
import { REFRESH_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { clearAuthCookies, setAuthCookies } from '@/lib/utils/authCookies';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/auth/refresh
 *
 * Exchanges the httpOnly refresh-token cookie for a new access/refresh
 * token pair. Used as a fallback by `proxy.ts` (silent refresh on
 * navigation) and can also be called directly by the client after a `401`
 * from another `/api/*` call to try to recover the session before
 * redirecting to `/login`.
 */
export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const refreshTokenValue = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshTokenValue) {
    return NextResponse.json({ message: 'No active session to refresh.' }, { status: 401 });
  }

  try {
    const result = await authBackend.refreshToken({ RefreshToken: refreshTokenValue });
    const response = NextResponse.json({ success: true }, { status: 200 });
    setAuthCookies(response, result.AccessToken, result.RefreshToken, result.ExpiresIn);
    return response;
  } catch (error) {
    logger.warn('Session refresh failed', error);
    const details = getBackendErrorDetails(error, 'Your session has expired. Please log in again.');
    const response = NextResponse.json({ message: details.message }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }
}
