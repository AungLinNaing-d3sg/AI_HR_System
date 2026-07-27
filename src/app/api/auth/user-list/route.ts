import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as authBackend from '@/lib/api/authBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { USERS_PAGE_SIZE } from '@/lib/constants/user.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapUserListItemList } from '@/lib/utils/mapAuthUser';
import type { UserListResponsePayload } from '@/types/api.types';

/**
 * GET /api/auth/user-list
 *
 * The full candidate-user list the searchable "Add User to Project"
 * combobox (`UserSearchCombobox`) on `/projects/:id/assignments`
 * (`docs/HR_System_FE_wireframe.pdf`) shows *before* the caller has typed
 * anything (and continues to filter client-side for a one/short-character
 * query, below `MIN_USER_SEARCH_QUERY_LENGTH`) - sourced from the same
 * paginated `GET /Auth/GetUserList` the `SystemAdmin`-only `/admin/users`
 * table uses (`USERS_PAGE_SIZE`), requesting the same large single page so
 * the combobox's initial view is effectively "every user account" rather
 * than an arbitrarily small first page. Once the query reaches
 * `MIN_USER_SEARCH_QUERY_LENGTH`, the combobox switches to
 * `GET /api/auth/search-users` instead, which can find any account
 * regardless of whether it made this page. Open to any authenticated user
 * (unlike `/api/auth/users`), matching the rest of the Projects surface.
 */
export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  try {
    const { Items } = await authBackend.getUserList(accessToken, { pageNo: 1, pageSize: USERS_PAGE_SIZE });
    return NextResponse.json<UserListResponsePayload>({ users: mapUserListItemList(Items) }, { status: 200 });
  } catch (error) {
    logger.error('Get user list failed', error);
    const details = getBackendErrorDetails(error, 'Could not load candidate users.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
