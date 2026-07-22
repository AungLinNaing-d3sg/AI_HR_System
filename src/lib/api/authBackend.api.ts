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
 * Paginated list of every user account in the system - candidates for the
 * "Add User to Project" dropdown on `/projects/:id/assignments`. Replaces
 * the removed `/Auth/GetUnassignedUsers` endpoint this app previously
 * called for that same dropdown; defaults to the first page of 10 users
 * (`pageNo=1&pageSize=10`), matching the dropdown's current, non-paginated
 * UI.
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
