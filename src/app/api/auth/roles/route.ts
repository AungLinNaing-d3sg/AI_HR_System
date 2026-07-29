import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as authBackend from '@/lib/api/authBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapRoleList } from '@/lib/utils/mapAuthUser';
import type { RoleListResponsePayload } from '@/types/api.types';

/**
 * GET /api/auth/roles
 *
 * Reference data for the `RoleId` dropdown on `/admin/users/create`
 * (`docs/HR_System_FE_wireframe.pdf`), sourced from `GET /Auth/GetRoles`.
 * `SystemAdmin`-only, matching the restriction on the `POST /api/auth/users`
 * endpoint this dropdown feeds - the role check here is defense-in-depth,
 * re-derived from the (unverified) access-token cookie on every call rather
 * than trusted from the client; the backend independently enforces the same
 * restriction and remains the real authorization boundary.
 */
export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  if (extractRole(claims) !== 'SystemAdmin') {
    return NextResponse.json({ message: 'Only a System Admin can view roles.' }, { status: 403 });
  }

  try {
    const roles = await authBackend.getRoles(accessToken);
    return NextResponse.json<RoleListResponsePayload>({ roles: mapRoleList(roles) }, { status: 200 });
  } catch (error) {
    logger.error('Get roles failed', error);
    const details = getBackendErrorDetails(error, 'Could not load roles.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
