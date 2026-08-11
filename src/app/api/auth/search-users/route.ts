import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as authBackend from '@/lib/api/authBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapUserSearchItemList } from '@/lib/utils/mapAuthUser';
import { pickSearchParams } from '@/lib/utils/searchParams';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { searchUsersQuerySchema } from '@/lib/validators/auth.validators';
import type { SearchUsersResponsePayload } from '@/types/api.types';

/**
 * GET /api/auth/search-users?email=&userName=
 *
 * Backs the searchable "Add User to Project" combobox on
 * `/projects/:id/assignments` (`docs/HR_System_FE_wireframe.pdf`), sourced
 * from `GET /Auth/SearchUsers?email={email}&userName={userName}&isAllRole=` -
 * this is now that combobox's *only* data source, including its initial,
 * pre-search candidate list, replacing the previously used, separate,
 * non-search `GET /Auth/GetUserList` dropdown (see the removed
 * `app/api/auth/user-list/route.ts`). The combobox sends the same as-you-type
 * query text as both `email` and `userName` (see
 * `useUserSearch`/`auth.api.ts#searchUsers`), so the backend matches a user
 * by either field; `email`/`userName` are both fully optional -
 * `searchUsersQuerySchema` only rejects a *supplied* value shorter than
 * `MIN_USER_SEARCH_QUERY_LENGTH`, since the backend supports calling
 * `SearchUsers` with neither param to return its broad/unfiltered candidate
 * list. Open to any authenticated user, matching the rest of the Projects
 * surface.
 *
 * `isAllRole` is never accepted from the client, and - unlike this route's
 * previous, role-derived behavior - is now always `false` regardless of the
 * caller's own role: this route exclusively backs the "Add User to Project"
 * flow, which only ever assigns `Employee` ("Assigned User") resources to a
 * project, never other admin accounts, so a `SystemAdmin` no longer gets a
 * wider, every-role search here than a `ProjectAdmin`/plain `Employee` would.
 * The `SystemAdmin`-only, every-role search backing the `/admin/users`
 * management table's own search box is a separate concern - see
 * `app/api/auth/users/route.ts`.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  const isAllRole = false;
  const searchParams = new URL(request.url).searchParams;
  const parsed = searchUsersQuerySchema.safeParse(pickSearchParams(searchParams, ['email', 'userName']));
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Enter at least 2 characters to search.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const users = await authBackend.searchUsers({ ...parsed.data, isAllRole }, accessToken);
    return NextResponse.json<SearchUsersResponsePayload>(
      { users: mapUserSearchItemList(users) },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Search users failed', error);
    const details = getBackendErrorDetails(error, 'Could not search for users.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
