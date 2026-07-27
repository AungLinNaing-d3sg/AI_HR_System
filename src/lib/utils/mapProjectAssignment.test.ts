import {
  mapProjectAssignment,
  mapProjectAssignmentList,
  mapResourceRoleType,
  mapResourceRoleTypeList,
} from './mapProjectAssignment';
import type { ProjectAssignmentDto, ResourceRoleTypeDto } from '@/types/api.types';

const assignmentDto: ProjectAssignmentDto = {
  Id: 'assignment-1',
  UserId: 'user-1',
  FirstName: 'Alex',
  LastName: 'Kumar',
  Email: 'alex.kumar@example.com',
  ResourceRoleTypeId: 'role-1',
  RoleName: 'Senior Developer',
  AssignedAt: '2026-06-18T14:11:57',
  IsActive: true,
};

describe('mapProjectAssignment', () => {
  it('maps every PascalCase field to its camelCase domain equivalent', () => {
    expect(mapProjectAssignment(assignmentDto)).toEqual({
      id: 'assignment-1',
      userId: 'user-1',
      firstName: 'Alex',
      lastName: 'Kumar',
      email: 'alex.kumar@example.com',
      resourceRoleTypeId: 'role-1',
      roleName: 'Senior Developer',
      assignedAt: '2026-06-18T14:11:57',
      isActive: true,
    });
  });
});

describe('mapProjectAssignmentList', () => {
  it('maps an array of DTOs', () => {
    const result = mapProjectAssignmentList([assignmentDto, { ...assignmentDto, Id: 'assignment-2' }]);
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('assignment-2');
  });

  it('returns an empty array for an empty list', () => {
    expect(mapProjectAssignmentList([])).toEqual([]);
  });
});

const roleTypeDto: ResourceRoleTypeDto = {
  Id: 'role-1',
  Name: 'Senior Developer',
  Description: 'Senior software engineer with 5+ years experience',
};

describe('mapResourceRoleType', () => {
  it('maps every PascalCase field to its camelCase domain equivalent', () => {
    expect(mapResourceRoleType(roleTypeDto)).toEqual({
      id: 'role-1',
      name: 'Senior Developer',
      description: 'Senior software engineer with 5+ years experience',
    });
  });

  it('passes through a null description unchanged', () => {
    expect(mapResourceRoleType({ ...roleTypeDto, Description: null }).description).toBeNull();
  });
});

describe('mapResourceRoleTypeList', () => {
  it('maps an array of DTOs', () => {
    const result = mapResourceRoleTypeList([roleTypeDto, { ...roleTypeDto, Id: 'role-2' }]);
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('role-2');
  });

  it('returns an empty array for an empty list', () => {
    expect(mapResourceRoleTypeList([])).toEqual([]);
  });
});
