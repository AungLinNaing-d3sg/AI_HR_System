import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as authBackend from '@/lib/api/authBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { createUserSchema } from '@/lib/validators/auth.validators';
import type { CreateUserResponsePayload } from '@/types/api.types';

/**
 * POST /api/auth/users
 *
 * Creates a new user account. `[SystemAdmin]`-only per the backend
 * contract. The role check here is a defense-in-depth measure - the
 * `SystemAdmin`-only role claim is re-derived from the (unverified)
 * access-token cookie on every call rather than trusted from the client,
 * and the backend independently enforces the same restriction and remains
 * the real authorization boundary.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  if (extractRole(claims) !== 'SystemAdmin') {
    return NextResponse.json({ message: 'Only a System Admin can create users.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await authBackend.createUser(
      {
        Username: parsed.data.username,
        Email: parsed.data.email,
        Password: parsed.data.password,
        FirstName: parsed.data.firstName,
        LastName: parsed.data.lastName,
        EmployeeId: parsed.data.employeeId || null,
        CountryId: parsed.data.countryId || null,
        RoleId: parsed.data.roleId,
      },
      accessToken
    );

    return NextResponse.json<CreateUserResponsePayload>(
      {
        user: {
          id: dto.UserId,
          username: dto.Username,
          email: dto.Email,
          firstName: dto.FirstName,
          lastName: dto.LastName,
          employeeId: dto.EmployeeId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Create user failed', error);
    const details = getBackendErrorDetails(error, 'Could not create the user.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
