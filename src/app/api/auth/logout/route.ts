import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as authBackend from '@/lib/api/authBackend.api';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { clearAuthCookies } from '@/lib/utils/authCookies';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/auth/logout
 *
 * Best-effort: asks the backend to revoke the refresh token, then always
 * clears the local httpOnly session cookies regardless of whether the
 * backend call succeeded, so the user is never stuck "logged in" client-
 * side because of a transient backend/network error.
 */
export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (accessToken && refreshToken) {
    try {
      await authBackend.logout({ RefreshToken: refreshToken }, accessToken);
    } catch (error) {
      logger.warn('Backend logout call failed; clearing local session anyway.', error);
    }
  }

  const response = NextResponse.json({ success: true }, { status: 200 });
  clearAuthCookies(response);
  return response;
}
