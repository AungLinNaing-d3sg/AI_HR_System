import 'server-only';

import type { RoleDto, UnassignedUserDto } from '@/types/api.types';
import type { AuthenticatedUser, Role, UnassignedUser, UserRole } from '@/types/domain.types';

/**
 * Fields shared by the backend's Login/UpdateProfile/CreateUser user
 * payloads. None of those endpoints returns a role field consistently (or
 * at all, for UpdateProfile) - callers pass `role` explicitly, sourced from
 * the access token's JWT claim via `extractRole(decodeAccessToken(...))`,
 * since that's the one place the role is reliably present.
 */
export interface MapAuthUserDto {
  UserId: string;
  Username: string;
  Email: string;
  FirstName: string;
  LastName: string;
  EmployeeId?: string | null;
  CountryId?: string | null;
}

/**
 * Maps the backend's PascalCase Auth user DTO to the app's camelCase domain
 * model. Never forwards password hashes or other sensitive fields the
 * backend response might include - only the fields declared on
 * `AuthenticatedUser` are copied through.
 */
export function mapAuthUser(dto: MapAuthUserDto, role: UserRole): AuthenticatedUser {
  return {
    id: dto.UserId,
    username: dto.Username,
    email: dto.Email,
    firstName: dto.FirstName,
    lastName: dto.LastName,
    employeeId: dto.EmployeeId ?? null,
    countryId: dto.CountryId ?? null,
    role,
  };
}

/** Maps the backend's PascalCase Role DTO (`GET /Auth/GetRoles`) to the app's camelCase domain model. */
export function mapRole(dto: RoleDto): Role {
  return {
    id: dto.Id,
    name: dto.Name,
    description: dto.Description,
  };
}

export function mapRoleList(dtos: RoleDto[]): Role[] {
  return dtos.map(mapRole);
}

/**
 * Maps the backend's PascalCase Unassigned User DTO (`GET /Auth/GetUnassignedUsers`)
 * to the app's camelCase domain model.
 */
export function mapUnassignedUser(dto: UnassignedUserDto): UnassignedUser {
  return {
    userId: dto.UserId,
    firstName: dto.FirstName,
    lastName: dto.LastName,
    email: dto.Email,
  };
}

export function mapUnassignedUserList(dtos: UnassignedUserDto[]): UnassignedUser[] {
  return dtos.map(mapUnassignedUser);
}
