import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as authBackend from '@/lib/api/authBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapUnassignedUserList } from '@/lib/utils/mapAuthUser';
import type { UnassignedUsersResponsePayload } from '@/types/api.types';

/**
 * GET /api/auth/unassigned-users
 *
 * Candidate users for the "Add User to Project" dropdown on
 * `/projects/:id/assignments` (`docs/HR_System_FE_wireframe.pdf`), sourced
 * from `GET /Auth/GetUnassignedUsers` - every user with no current project
 * assignment. Global (no `projectId` path param), replacing the per-project
 * derivation this app previously computed by combining every project's
 * `GetProjectAssignments` response (see the removed
 * `app/api/projects/[id]/unassigned-users/route.ts`). Open to any
 * authenticated user, matching the rest of the Projects surface.
 */
export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  try {
    const users = await authBackend.getUnassignedUsers(accessToken);
    return NextResponse.json<UnassignedUsersResponsePayload>(
      { users: mapUnassignedUserList(users) },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Get unassigned users failed', error);
    const details = getBackendErrorDetails(error, 'Could not load candidate users.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
