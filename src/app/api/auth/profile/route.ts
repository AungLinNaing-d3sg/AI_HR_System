import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as authBackend from '@/lib/api/authBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapAuthUser } from '@/lib/utils/mapAuthUser';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { updateProfileSchema } from '@/lib/validators/auth.validators';
import type { AuthResponsePayload } from '@/types/api.types';

/**
 * PUT /api/auth/profile
 *
 * Updates the signed-in user's profile. Requires a valid, non-expired
 * access-token cookie; the token is never accepted from a request body or
 * header supplied by the client.
 */
export async function PUT(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken || isTokenExpired(decodeAccessToken(accessToken))) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await authBackend.updateProfile(
      {
        FirstName: parsed.data.firstName,
        LastName: parsed.data.lastName,
        Email: parsed.data.email,
        CountryId: parsed.data.countryId || null,
      },
      accessToken
    );

    return NextResponse.json<AuthResponsePayload>({ user: mapAuthUser(dto) }, { status: 200 });
  } catch (error) {
    logger.error('Update profile failed', error);
    const details = getBackendErrorDetails(error, 'Could not update your profile.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
