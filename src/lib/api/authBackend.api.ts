import 'server-only';

import { backendClient } from '@/lib/api/backendClient';
import type {
  ChangePasswordRequest,
  CreateUserRequest,
  CreateUserResponse,
  GetRolesResponse,
  GetUserListResponse,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ResetPasswordRequest,
  SearchUsersResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  UpdateUserRequest,
  UpdateUserResponseDto,
} from '@/types/api.types';

/**
 * Server-only Auth domain module. Every function here calls the real .NET
 * `/api/v1/Auth/*` endpoints (see docs/HR_System_BE.postman_collection.json)
 * through `backendClient`. Only Route Handlers under `app/api/auth/**` and
 * `proxy.ts` may import this file - it is never bundled for the browser.
 */

function authHeader(accessToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const response = await backendClient.post<LoginResponse>('/Auth/Login', payload);
  return response.data;
}

export async function refreshToken(payload: RefreshTokenRequest): Promise<RefreshTokenResponse> {
  const response = await backendClient.post<RefreshTokenResponse>('/Auth/RefreshToken', payload);
  return response.data;
}

export async function logout(payload: LogoutRequest, accessToken: string): Promise<void> {
  await backendClient.post('/Auth/Logout', payload, { headers: authHeader(accessToken) });
}

export async function updateProfile(
  payload: UpdateProfileRequest,
  accessToken: string
): Promise<UpdateProfileResponse> {
  const response = await backendClient.put<UpdateProfileResponse>('/Auth/UpdateProfile', payload, {
    headers: authHeader(accessToken),
  });
  return response.data;
}

export async function changePassword(
  payload: ChangePasswordRequest,
  accessToken: string
): Promise<void> {
  await backendClient.put('/Auth/ChangePassword', payload, { headers: authHeader(accessToken) });
}

export async function createUser(
  payload: CreateUserRequest,
  accessToken: string
): Promise<CreateUserResponse> {
  const response = await backendClient.post<CreateUserResponse>('/Auth/CreateUser', payload, {
    headers: authHeader(accessToken),
  });
  return response.data;
}

/** Reference data for the Create User `RoleId` dropdown. */
export async function getRoles(accessToken: string): Promise<GetRolesResponse> {
  const response = await backendClient.get<GetRolesResponse>('/Auth/GetRoles', {
    headers: authHeader(accessToken),
  });
  return response.data;
}

export interface GetUserListQuery {
  pageNo?: number;
  pageSize?: number;
}

/**
 * Paginated list of every user account in the system - backs the
 * `SystemAdmin`-only `/admin/users` management table (see
 * `app/api/auth/users/route.ts`, which requests a large single page via
 * `USERS_PAGE_SIZE`), and the "Add User to Project" combobox's initial,
 * pre-search option list (`app/api/auth/user-list/route.ts`, also
 * `USERS_PAGE_SIZE`), so that combobox shows every candidate user up front
 * instead of only once the caller starts typing - `searchUsers`/
 * `GET /Auth/SearchUsers` below still backs that same combobox's as-you-type
 * filtering once the query is long enough.
 */
export async function getUserList(
  accessToken: string,
  query: GetUserListQuery = {}
): Promise<GetUserListResponse> {
  const { pageNo = 1, pageSize = 10 } = query;
  const response = await backendClient.get<GetUserListResponse>('/Auth/GetUserList', {
    headers: authHeader(accessToken),
    params: { pageNo, pageSize },
  });
  return response.data;
}

export interface SearchUsersQuery {
  email?: string;
  userName?: string;
  /**
   * `true` widens the search to accounts of every role; `false` restricts it
   * to `Employee` ("Assigned User") accounts only. Always computed
   * server-side by `app/api/auth/search-users/route.ts` from the caller's own
   * decoded JWT role (`SystemAdmin`/`ProjectAdmin` -> `true`, `Employee`/plain
   * `User` -> `false`) - never accepted as a client-supplied query param, so a
   * lower-privileged caller can't widen their own search results.
   */
  isAllRole: boolean;
}

/**
 * Free-text user search backing the searchable "Add User to Project"
 * combobox on `/projects/:id/assignments` once its query text reaches
 * `MIN_USER_SEARCH_QUERY_LENGTH` - below that, the combobox instead filters
 * its already-loaded `getUserList` result set client-side (see
 * `UserSearchCombobox`). The Route Handler sends the browser's as-you-type
 * query as both `email` and `userName` (see `useUserSearch`), so the backend
 * matches a user by either field, plus the caller-role-derived `isAllRole`
 * (see `SearchUsersQuery#isAllRole` above).
 */
export async function searchUsers(
  query: SearchUsersQuery,
  accessToken: string
): Promise<SearchUsersResponse> {
  const response = await backendClient.get<SearchUsersResponse>('/Auth/SearchUsers', {
    headers: authHeader(accessToken),
    params: query,
  });
  return response.data;
}

/**
 * Updates an existing user account - backs the `SystemAdmin`-only
 * `/admin/users` management table's row-level "Edit" action and its
 * Activate/Deactivate toggle (both submit the same `UpdateUser` payload,
 * the latter only flipping `IsActive`), since there is no dedicated
 * deactivate/delete endpoint for a user account (see
 * docs/HR_System_BE.postman_collection.json).
 */
export async function updateUser(
  id: string,
  payload: UpdateUserRequest,
  accessToken: string
): Promise<UpdateUserResponseDto> {
  const response = await backendClient.put<UpdateUserResponseDto>(`/Auth/UpdateUser/${id}`, payload, {
    headers: authHeader(accessToken),
  });
  return response.data;
}

/**
 * Resets another user's password to a value the calling `SystemAdmin`
 * chooses - backs the `/admin/users` management table's row-level "Reset
 * Password" action (see `app/api/auth/users/[id]/reset-password/route.ts`).
 * `Data: null` on success (see `ResetPasswordResponse`), so there is nothing
 * to map back to the caller beyond confirmation.
 */
export async function resetPassword(
  id: string,
  payload: ResetPasswordRequest,
  accessToken: string
): Promise<void> {
  await backendClient.put(`/Auth/ResetPassword/${id}`, payload, {
    headers: authHeader(accessToken),
  });
}
