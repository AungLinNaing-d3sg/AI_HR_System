import { mapProject, mapProjectList } from './mapProject';
import type { ProjectDto } from '@/types/api.types';

const dto: ProjectDto = {
  Id: 'project-1',
  Code: 'PRJ-001',
  Name: 'Sample Project',
  Description: 'A sample project description',
  ClientName: 'Acme Corp',
  ClientEmail: 'client@acme.com',
  StartDate: '2025-01-01',
  EndDate: '2025-12-31',
  MaxDailyHours: 8,
  IsActive: true,
};

describe('mapProject', () => {
  it('maps every PascalCase field to its camelCase domain equivalent', () => {
    expect(mapProject(dto)).toEqual({
      id: 'project-1',
      code: 'PRJ-001',
      name: 'Sample Project',
      description: 'A sample project description',
      clientName: 'Acme Corp',
      clientEmail: 'client@acme.com',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      maxDailyHours: 8,
      isActive: true,
    });
  });

  it('passes through null optional fields unchanged', () => {
    const nullableDto: ProjectDto = {
      ...dto,
      Description: null,
      ClientName: null,
      ClientEmail: null,
      StartDate: null,
      EndDate: null,
      MaxDailyHours: null,
    };
    const result = mapProject(nullableDto);
    expect(result.description).toBeNull();
    expect(result.clientName).toBeNull();
    expect(result.maxDailyHours).toBeNull();
  });
});

describe('mapProjectList', () => {
  it('maps an array of DTOs', () => {
    const result = mapProjectList([dto, { ...dto, Id: 'project-2', Code: 'PRJ-002' }]);
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('project-2');
  });

  it('returns an empty array for an empty list', () => {
    expect(mapProjectList([])).toEqual([]);
  });
});
