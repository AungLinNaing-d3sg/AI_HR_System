import 'server-only';

import type { ProjectDto } from '@/types/api.types';
import type { Project } from '@/types/domain.types';

/** Maps the backend's PascalCase Project DTO to the app's camelCase domain model. */
export function mapProject(dto: ProjectDto): Project {
  return {
    id: dto.Id,
    code: dto.Code,
    name: dto.Name,
    description: dto.Description,
    clientName: dto.ClientName,
    clientEmail: dto.ClientEmail,
    startDate: dto.StartDate,
    endDate: dto.EndDate,
    maxDailyHours: dto.MaxDailyHours,
    isActive: dto.IsActive,
  };
}

export function mapProjectList(dtos: ProjectDto[]): Project[] {
  return dtos.map(mapProject);
}
