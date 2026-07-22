import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as authBackend from '@/lib/api/authBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapUserListItemList } from '@/lib/utils/mapAuthUser';
import type { UserListResponsePayload } from '@/types/api.types';

/**
 * GET /api/auth/user-list
 *
 * Candidate users for the "Add User to Project" dropdown on
 * `/projects/:id/assignments` (`docs/HR_System_FE_wireframe.pdf`), sourced
 * from the paginated `GET /Auth/GetUserList?pageNo=1&pageSize=10` -
 * replacing the previously used `GET /Auth/GetUnassignedUsers` (see the
 * removed `app/api/auth/unassigned-users/route.ts`). Unlike the endpoint it
 * replaces, `GetUserList` returns every user account regardless of current
 * project assignment; it is not scoped to a single project, so the query
 * key remains a flat `['auth', 'user-list']` tuple shared across every
 * project's assignments panel. Open to any authenticated user, matching the
 * rest of the Projects surface.
 */
export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  try {
    const { Items } = await authBackend.getUserList(accessToken, { pageNo: 1, pageSize: 10 });
    return NextResponse.json<UserListResponsePayload>(
      { users: mapUserListItemList(Items) },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Get user list failed', error);
    const details = getBackendErrorDetails(error, 'Could not load candidate users.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
