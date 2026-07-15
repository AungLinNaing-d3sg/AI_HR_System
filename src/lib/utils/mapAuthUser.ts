import 'server-only';

import type { AuthUserDto } from '@/types/api.types';
import type { AuthenticatedUser } from '@/types/domain.types';

/**
 * Maps the backend's PascalCase Auth user DTO to the app's camelCase domain
 * model. Never forwards password hashes or other sensitive fields the
 * backend response might include - only the fields declared on
 * `AuthenticatedUser` are copied through.
 */
export function mapAuthUser(dto: AuthUserDto): AuthenticatedUser {
  return {
    id: dto.Id,
    username: dto.Username,
    email: dto.Email,
    firstName: dto.FirstName,
    lastName: dto.LastName,
    employeeId: dto.EmployeeId,
    countryId: dto.CountryId,
    role: dto.RoleName,
  };
}
