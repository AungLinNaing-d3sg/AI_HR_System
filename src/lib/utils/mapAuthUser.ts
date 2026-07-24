import 'server-only';

import type { UpdateUserResponseDto, RoleDto, UserListItemDto, UserSearchItemDto } from '@/types/api.types';
import type { AdminUserListItem, AuthenticatedUser, Role, UserListItem, UserRole } from '@/types/domain.types';

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
 * Maps a single `GET /Auth/GetUserList` item (PascalCase) to the app's
 * camelCase `UserListItem` domain model used by the "Add User to Project"
 * dropdown.
 */
export function mapUserListItem(dto: UserListItemDto): UserListItem {
  return {
    userId: dto.UserId,
    firstName: dto.FirstName,
    lastName: dto.LastName,
    email: dto.Email,
  };
}

export function mapUserListItemList(dtos: UserListItemDto[]): UserListItem[] {
  return dtos.map(mapUserListItem);
}

/**
 * Maps a single `GET /Auth/SearchUsers` item (PascalCase) to the app's
 * camelCase `UserListItem` domain model used by the searchable "Add User to
 * Project" combobox. Only forwards the fields the combobox needs - role,
 * country, and active-status fields the search endpoint additionally
 * returns are intentionally dropped, same as `mapUserListItem`.
 */
export function mapUserSearchItem(dto: UserSearchItemDto): UserListItem {
  return {
    userId: dto.UserId,
    firstName: dto.FirstName,
    lastName: dto.LastName,
    email: dto.Email,
  };
}

export function mapUserSearchItemList(dtos: UserSearchItemDto[]): UserListItem[] {
  return dtos.map(mapUserSearchItem);
}

/**
 * Maps a single `GET /Auth/GetUserList` item (PascalCase) to the app's
 * camelCase `AdminUserListItem` domain model backing the `SystemAdmin`-only
 * `/admin/users` management table - unlike `mapUserListItem`, this keeps the
 * `username`/`employeeId`/role/country/active-status fields the table's
 * Role/Country/Status columns and row-level actions need. `roleName`/
 * `countryId`/`countryCode`/`countryName` are declared optional on the DTO
 * (see `UserListItemDto`'s comment) since not every backend response is
 * guaranteed to include them - each defaults to `null` rather than throwing
 * when absent. `isActive` defaults to `true` when the backend omits it
 * (`GET /Auth/GetUserList`'s documented example response doesn't include an
 * `IsActive` field, unlike `SearchUsers`'s), matching this app's existing
 * assumption that `GetUserList` only ever returns non-deleted accounts.
 */
export function mapAdminUserListItem(dto: UserListItemDto): AdminUserListItem {
  return {
    userId: dto.UserId,
    username: dto.Username,
    firstName: dto.FirstName,
    lastName: dto.LastName,
    email: dto.Email,
    employeeId: dto.EmployeeId ?? null,
    roleName: dto.RoleName ?? null,
    countryId: dto.CountryId ?? null,
    countryCode: dto.CountryCode ?? null,
    countryName: dto.CountryName ?? null,
    isActive: dto.IsActive ?? true,
  };
}

export function mapAdminUserListItemList(dtos: UserListItemDto[]): AdminUserListItem[] {
  return dtos.map(mapAdminUserListItem);
}

/**
 * Maps `PUT /Auth/UpdateUser/{id}`'s response `Data` (PascalCase) to the
 * app's camelCase `AdminUserListItem` domain model, so a successful edit can
 * be reflected immediately without waiting on a full `['auth', 'users']`
 * refetch. Unlike `UserListItemDto`, this DTO doesn't echo back
 * `CountryCode`/`CountryName` (see `UpdateUserResponseDto`'s comment in
 * `api.types.ts`) - callers needing the resolved country name continue to
 * rely on the invalidated `['auth', 'users']` list.
 */
export function mapUpdateUserResponse(dto: UpdateUserResponseDto): AdminUserListItem {
  return {
    userId: dto.UserId,
    username: dto.Username,
    firstName: dto.FirstName,
    lastName: dto.LastName,
    email: dto.Email,
    employeeId: dto.EmployeeId ?? null,
    roleName: dto.RoleName ?? null,
    countryId: dto.CountryId ?? null,
    countryCode: null,
    countryName: null,
    isActive: dto.IsActive,
  };
}
