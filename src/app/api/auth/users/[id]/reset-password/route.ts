import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as authBackend from '@/lib/api/authBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { resetPasswordSchema } from '@/lib/validators/auth.validators';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/auth/users/:id/reset-password
 *
 * Resets another user's password - backs the `SystemAdmin`-only
 * `/admin/users` management table's row-level "Reset Password" action (see
 * `UsersTable`/`ResetPasswordForm`), forwarding to `PUT
 * /Auth/ResetPassword/{id}` (see docs/HR_System_BE.postman_collection.json).
 * `[SystemAdmin]`-only per the backend contract; the role check here is a
 * defense-in-depth measure re-derived from the (unverified) access-token
 * cookie on every call rather than trusted from the client - the backend
 * independently enforces the same restriction and remains the real
 * authorization boundary. Unlike `/api/auth/change-password`, there is no
 * `CurrentPassword` to verify - the caller is an admin acting on someone
 * else's account.
 */
export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  if (extractRole(claims) !== 'SystemAdmin') {
    return NextResponse.json({ message: 'Only a System Admin can reset a user’s password.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    await authBackend.resetPassword(
      id,
      {
        NewPassword: parsed.data.newPassword,
        ConfirmNewPassword: parsed.data.confirmNewPassword,
      },
      accessToken
    );

    return NextResponse.json({ success: true, message: 'Password reset successfully.' }, { status: 200 });
  } catch (error) {
    logger.error('Reset password failed', error);
    const details = getBackendErrorDetails(error, 'Could not reset this user’s password.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
