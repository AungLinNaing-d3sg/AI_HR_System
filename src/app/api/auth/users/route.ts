import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as authBackend from '@/lib/api/authBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { USERS_PAGE_SIZE } from '@/lib/constants/user.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapAdminUserListItemList } from '@/lib/utils/mapAuthUser';
import { resolvePagination } from '@/lib/utils/pagination';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { createUserSchema } from '@/lib/validators/auth.validators';
import type { CreateUserResponsePayload, UsersListResponsePayload } from '@/types/api.types';

/**
 * GET /api/auth/users?pageNo=&pageSize=
 *
 * Every user account in the system, for the `/admin/users` management
 * table's own server-side pagination (`docs/HR_System_FE_wireframe.pdf`).
 * `[SystemAdmin]`-only, unlike `/api/auth/user-list` (open to any
 * authenticated role, capped at 10 rows, for the "Add User to Project"
 * dropdown). `pageNo`/`pageSize` are optional, falling back to one large
 * page (`USERS_PAGE_SIZE`) if omitted.
 *
 * `GET /Auth/GetUserList` now returns each account's `RoleName`/
 * `CountryId`/`CountryCode`/`CountryName` inline (see
 * docs/HR_System_BE.postman_collection.json), so this route maps through
 * `mapAdminUserListItemList` (not the lighter `mapUserListItemList` the
 * "Add User to Project" dropdown uses) to surface those fields for the
 * table's Role/Country/Status columns and row-level Edit/Activate actions.
 * A row missing a confirmed role still renders a "Role unavailable" state
 * (see `UserRoleBadge`) rather than fabricating one.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  if (extractRole(claims) !== 'SystemAdmin') {
    return NextResponse.json({ message: 'Only a System Admin can view the user list.' }, { status: 403 });
  }

  const { pageNo, pageSize } = resolvePagination(new URL(request.url).searchParams, {
    pageNo: 1,
    pageSize: USERS_PAGE_SIZE,
  });

  try {
    const { Items, TotalCount, PageNo, PageSize } = await authBackend.getUserList(accessToken, {
      pageNo,
      pageSize,
    });
    return NextResponse.json<UsersListResponsePayload>(
      { users: mapAdminUserListItemList(Items), totalCount: TotalCount, pageNo: PageNo, pageSize: PageSize },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Get users failed', error);
    const details = getBackendErrorDetails(error, 'Could not load users.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

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
