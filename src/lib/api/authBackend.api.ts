import 'server-only';

import { backendClient } from '@/lib/api/backendClient';
import type {
  ChangePasswordRequest,
  CreateUserRequest,
  CreateUserResponse,
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
