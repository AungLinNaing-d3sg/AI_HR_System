/**
 * @jest-environment node
 */
jest.mock('../api/projectsBackend.api', () => ({
  getProjectAssignments: jest.fn(),
}));

jest.mock('../api/timesheetsBackend.api', () => ({
  getProjectAdminTimesheetSummary: jest.fn(),
}));

const projectsBackend = jest.requireMock('../api/projectsBackend.api') as {
  getProjectAssignments: jest.Mock;
};
const timesheetsBackend = jest.requireMock('../api/timesheetsBackend.api') as {
  getProjectAdminTimesheetSummary: jest.Mock;
};

import { filterProjectsAssignedToUser, getProjectAdminAssignedProjectIds } from './timesheetAccess';
import type { ProjectDto } from '@/types/api.types';

function project(overrides: Partial<ProjectDto> = {}): ProjectDto {
  return {
    Id: 'project-1',
    Code: 'PRJ-001',
    Name: 'Project Helix',
    Description: null,
    ClientName: null,
    ClientEmail: null,
    StartDate: null,
    EndDate: null,
    MaxDailyHours: null,
    IsActive: true,
    ...overrides,
  };
}

describe('filterProjectsAssignedToUser', () => {
  beforeEach(() => {
    projectsBackend.getProjectAssignments.mockReset();
  });

  it('keeps only projects where the user has an active assignment', async () => {
    const projectA = project({ Id: 'project-a' });
    const projectB = project({ Id: 'project-b' });

    projectsBackend.getProjectAssignments.mockImplementation((projectId: string) => {
      if (projectId === 'project-a') {
        return Promise.resolve([{ UserId: 'user-1', IsActive: true }]);
      }
      return Promise.resolve([{ UserId: 'someone-else', IsActive: true }]);
    });

    const result = await filterProjectsAssignedToUser([projectA, projectB], 'user-1', 'token');
    expect(result).toEqual([projectA]);
  });

  it('excludes a project where the user is assigned but inactive', async () => {
    const projectA = project({ Id: 'project-a' });
    projectsBackend.getProjectAssignments.mockResolvedValue([{ UserId: 'user-1', IsActive: false }]);

    const result = await filterProjectsAssignedToUser([projectA], 'user-1', 'token');
    expect(result).toEqual([]);
  });

  it('fails closed (excludes the project) when the assignment lookup rejects', async () => {
    const projectA = project({ Id: 'project-a' });
    projectsBackend.getProjectAssignments.mockRejectedValue(new Error('network down'));

    const result = await filterProjectsAssignedToUser([projectA], 'user-1', 'token');
    expect(result).toEqual([]);
  });

  it('returns an empty array for an empty project list without calling the backend', async () => {
    const result = await filterProjectsAssignedToUser([], 'user-1', 'token');
    expect(result).toEqual([]);
    expect(projectsBackend.getProjectAssignments).not.toHaveBeenCalled();
  });
});

describe('getProjectAdminAssignedProjectIds', () => {
  beforeEach(() => {
    timesheetsBackend.getProjectAdminTimesheetSummary.mockReset();
  });

  it('returns the set of project ids from the summary\'s ProjectSummaries', async () => {
    timesheetsBackend.getProjectAdminTimesheetSummary.mockResolvedValue({
      TotalHours: 40,
      ApprovedHours: 20,
      PendingHours: 20,
      ProjectSummaries: [
        { ProjectId: 'project-1', ProjectCode: 'D3SG001', ProjectName: 'STP', TotalHours: 40, ApprovedHours: 20, PendingHours: 20 },
        { ProjectId: 'project-2', ProjectCode: 'D3SG002', ProjectName: 'Other', TotalHours: 0, ApprovedHours: 0, PendingHours: 0 },
      ],
      Entries: [],
    });

    const result = await getProjectAdminAssignedProjectIds('token');
    expect(result).toEqual(new Set(['project-1', 'project-2']));
  });

  it('returns an empty set when the summary has no Data', async () => {
    timesheetsBackend.getProjectAdminTimesheetSummary.mockResolvedValue(null);
    const result = await getProjectAdminAssignedProjectIds('token');
    expect(result).toEqual(new Set());
  });
});
