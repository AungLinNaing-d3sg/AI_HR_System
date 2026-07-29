import 'server-only';

import type { ProjectAssignmentDto, ResourceRoleTypeDto } from '@/types/api.types';
import type { ProjectAssignment, ResourceRoleType } from '@/types/domain.types';

/** Maps the backend's PascalCase Project Assignment DTO to the app's camelCase domain model. */
export function mapProjectAssignment(dto: ProjectAssignmentDto): ProjectAssignment {
  return {
    id: dto.Id,
    userId: dto.UserId,
    firstName: dto.FirstName,
    lastName: dto.LastName,
    email: dto.Email,
    resourceRoleTypeId: dto.ResourceRoleTypeId,
    roleName: dto.RoleName,
    assignedAt: dto.AssignedAt,
    isActive: dto.IsActive,
  };
}

export function mapProjectAssignmentList(dtos: ProjectAssignmentDto[]): ProjectAssignment[] {
  return dtos.map(mapProjectAssignment);
}

/** Maps the backend's PascalCase Resource Role Type DTO to the app's camelCase domain model. */
export function mapResourceRoleType(dto: ResourceRoleTypeDto): ResourceRoleType {
  return {
    id: dto.Id,
    name: dto.Name,
    description: dto.Description,
  };
}

export function mapResourceRoleTypeList(dtos: ResourceRoleTypeDto[]): ResourceRoleType[] {
  return dtos.map(mapResourceRoleType);
}
