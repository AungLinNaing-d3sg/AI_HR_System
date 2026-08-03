import { NextResponse } from 'next/server';
import * as authBackend from '@/lib/api/authBackend.api';
import { setAuthCookies } from '@/lib/utils/authCookies';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, secondsUntilExpiry } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapAuthUser } from '@/lib/utils/mapAuthUser';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { loginSchema } from '@/lib/validators/auth.validators';
import type { AuthResponsePayload } from '@/types/api.types';

/**
 * POST /api/auth/login
 *
 * BFF Route Handler: validates the request, forwards credentials to the
 * .NET `/Auth/Login` endpoint, then sets the access/refresh tokens as
 * httpOnly cookies before returning only the non-sensitive user profile to
 * the browser. The JWTs themselves never appear in the JSON response body.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check your username/email and password.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const result = await authBackend.login({
      UsernameOrEmail: parsed.data.usernameOrEmail,
      Password: parsed.data.password,
    });

    const claims = decodeAccessToken(result.AccessToken);
    const role = extractRole(claims) ?? 'Employee';
    const user = mapAuthUser(
      {
        UserId: result.UserId,
        Username: result.Username,
        Email: result.Email,
        FirstName: result.FirstName,
        LastName: result.LastName,
      },
      role
    );
    const response = NextResponse.json<AuthResponsePayload>({ user }, { status: 200 });
    setAuthCookies(response, result.AccessToken, result.RefreshToken, secondsUntilExpiry(claims));
    return response;
  } catch (error) {
    logger.error('Login failed', error);
    const details = getBackendErrorDetails(error, 'Invalid username/email or password.');
    return NextResponse.json(
      { message: details.message, errors: details.errors },
      { status: details.status }
    );
  }
}
