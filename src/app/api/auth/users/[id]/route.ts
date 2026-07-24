import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as authBackend from '@/lib/api/authBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapUpdateUserResponse } from '@/lib/utils/mapAuthUser';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { updateUserSchema } from '@/lib/validators/auth.validators';
import type { UpdateUserResponsePayload } from '@/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/auth/users/:id
 *
 * Updates an existing user account - backs the `SystemAdmin`-only
 * `/admin/users` management table's row-level "Edit" action and its
 * Activate/Deactivate toggle (see `UsersTable`/`UserEditForm`), both of
 * which submit this same shape (the toggle resends the row's current
 * values with only `isActive` flipped). `[SystemAdmin]`-only per the
 * backend contract (`docs/HR_System_BE.postman_collection.json`); the role
 * check here is a defense-in-depth measure re-derived from the (unverified)
 * access-token cookie on every call rather than trusted from the client -
 * the backend independently enforces the same restriction and remains the
 * real authorization boundary.
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
    return NextResponse.json({ message: 'Only a System Admin can update users.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await authBackend.updateUser(
      id,
      {
        Username: parsed.data.username,
        Email: parsed.data.email,
        FirstName: parsed.data.firstName,
        LastName: parsed.data.lastName,
        EmployeeId: parsed.data.employeeId || null,
        CountryId: parsed.data.countryId || null,
        IsActive: parsed.data.isActive,
        RoleId: parsed.data.roleId || null,
      },
      accessToken
    );

    return NextResponse.json<UpdateUserResponsePayload>({ user: mapUpdateUserResponse(dto) }, { status: 200 });
  } catch (error) {
    logger.error('Update user failed', error);
    const details = getBackendErrorDetails(error, 'Could not update the user.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
