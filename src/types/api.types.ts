/**
 * Request/response DTOs for the Auth domain, mirroring the backend contract
 * exactly (PascalCase field names) as documented in
 * docs/HR_System_BE.postman_collection.json.
 *
 * Backend serializes with `PropertyNamingPolicy = null`, so these shapes are
 * intentionally PascalCase to match the wire format. Client-facing code
 * should map these into the camelCase domain models in `domain.types.ts`
 * before handing data to components/hooks.
 */

import type { UserRole } from './domain.types';

/** Raw user payload as returned by the backend inside Auth responses. */
export interface AuthUserDto {
  Id: string;
  Username: string;
  Email: string;
  FirstName: string;
  LastName: string;
  EmployeeId: string | null;
  CountryId: string | null;
  RoleId: string;
  RoleName: UserRole;
}

export interface LoginRequest {
  UsernameOrEmail: string;
  Password: string;
}

export interface LoginResponse {
  AccessToken: string;
  RefreshToken: string;
  ExpiresIn: number;
  User: AuthUserDto;
}

export interface RefreshTokenRequest {
  RefreshToken: string;
}

export interface RefreshTokenResponse {
  AccessToken: string;
  RefreshToken: string;
  ExpiresIn: number;
}

export interface LogoutRequest {
  RefreshToken: string;
}

export interface UpdateProfileRequest {
  FirstName: string;
  LastName: string;
  Email: string;
  CountryId?: string | null;
}

export type UpdateProfileResponse = AuthUserDto;

export interface ChangePasswordRequest {
  CurrentPassword: string;
  NewPassword: string;
  ConfirmNewPassword: string;
}

export interface CreateUserRequest {
  Username: string;
  Email: string;
  Password: string;
  FirstName: string;
  LastName: string;
  EmployeeId?: string | null;
  CountryId?: string | null;
  RoleId: string;
}

export type CreateUserResponse = AuthUserDto;

/** Shape of error bodies returned by the backend (best-effort, defensive). */
export interface ApiErrorResponse {
  Message?: string;
  Errors?: Record<string, string[]>;
  StatusCode?: number;
}

/** Shape returned by this app's own BFF route handlers to the browser. */
export interface AuthResponsePayload {
  user: import('./domain.types').AuthenticatedUser;
}
