import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as authBackend from '@/lib/api/authBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { changePasswordSchema } from '@/lib/validators/auth.validators';

/**
 * PUT /api/auth/change-password
 *
 * Changes the signed-in user's password. Requires a valid, non-expired
 * access-token cookie. The backend itself independently verifies
 * `CurrentPassword` before applying the change.
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

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    await authBackend.changePassword(
      {
        CurrentPassword: parsed.data.currentPassword,
        NewPassword: parsed.data.newPassword,
        ConfirmNewPassword: parsed.data.confirmNewPassword,
      },
      accessToken
    );

    return NextResponse.json({ success: true, message: 'Password changed successfully.' }, { status: 200 });
  } catch (error) {
    logger.error('Change password failed', error);
    const details = getBackendErrorDetails(error, 'Could not change your password.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
