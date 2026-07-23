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
  SearchUsersResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
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
 * `USERS_PAGE_SIZE`). Previously also powered the "Add User to Project"
 * dropdown on `/projects/:id/assignments` (defaulting to `pageNo=1&
 * pageSize=10` for that use case); that dropdown now searches instead, via
 * `searchUsers`/`GET /Auth/SearchUsers` below (see the removed
 * `app/api/auth/user-list/route.ts`).
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
}

/**
 * Free-text user search backing the searchable "Add User to Project"
 * combobox on `/projects/:id/assignments` - replaces the previously used,
 * non-search `GET /Auth/GetUserList` dropdown (see the removed
 * `app/api/auth/user-list/route.ts`). The Route Handler sends the browser's
 * as-you-type query as both `email` and `userName` (see `useUserSearch`), so
 * the backend matches a user by either field.
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
