import {
  mapTimesheetEntry,
  mapTimesheetEntryList,
  mapTimesheetHistoryEntry,
  mapTimesheetHistoryEntryList,
  mapTimesheetPeriod,
  mapTimesheetPeriodList,
} from './mapTimesheet';
import type { TimesheetEntryDto, TimesheetPeriodDto } from '@/types/api.types';

const periodDto: TimesheetPeriodDto = {
  Id: 'period-1',
  PeriodStart: '2025-02-01',
  PeriodEnd: '2025-02-28',
  IsLocked: false,
};

const entryDto: TimesheetEntryDto = {
  Id: 'entry-1',
  UserId: 'user-1',
  ProjectId: 'project-1',
  TimesheetPeriodId: 'period-1',
  EntryDate: '2025-02-24',
  Hours: 6,
  TaskDescription: 'Frontend component development',
  IsApproved: false,
};

describe('mapTimesheetPeriod', () => {
  it('maps every PascalCase field to its camelCase domain equivalent', () => {
    expect(mapTimesheetPeriod(periodDto)).toEqual({
      id: 'period-1',
      periodStart: '2025-02-01',
      periodEnd: '2025-02-28',
      isLocked: false,
    });
  });
});

describe('mapTimesheetPeriodList', () => {
  it('maps an array of DTOs', () => {
    const result = mapTimesheetPeriodList([periodDto, { ...periodDto, Id: 'period-2' }]);
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('period-2');
  });

  it('returns an empty array for an empty list', () => {
    expect(mapTimesheetPeriodList([])).toEqual([]);
  });
});

describe('mapTimesheetEntry', () => {
  it('maps every PascalCase field to its camelCase domain equivalent', () => {
    expect(mapTimesheetEntry(entryDto)).toEqual({
      id: 'entry-1',
      projectId: 'project-1',
      timesheetPeriodId: 'period-1',
      entryDate: '2025-02-24',
      hours: 6,
      taskDescription: 'Frontend component development',
      isApproved: false,
    });
  });

  it('passes through a null task description unchanged', () => {
    const result = mapTimesheetEntry({ ...entryDto, TaskDescription: null });
    expect(result.taskDescription).toBeNull();
  });
});

describe('mapTimesheetEntryList', () => {
  it('maps an array of DTOs', () => {
    const result = mapTimesheetEntryList([entryDto, { ...entryDto, Id: 'entry-2' }]);
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('entry-2');
  });

  it('returns an empty array for an empty list', () => {
    expect(mapTimesheetEntryList([])).toEqual([]);
  });
});

describe('mapTimesheetHistoryEntry', () => {
  const historyDto: TimesheetEntryDto = {
    ...entryDto,
    UserFirstName: 'Lin Thit',
    UserLastName: 'Htoo',
    ResourceRoleTypeName: 'Senior Developer',
    ProjectCode: 'PRJ-001',
    ProjectName: 'Project Helix',
    IsApproved: true,
    ApprovedAt: '2026-06-22T05:18:00',
  };

  it('maps the denormalized fields returned by GetAllTimesheetEntries', () => {
    expect(mapTimesheetHistoryEntry(historyDto)).toEqual({
      id: 'entry-1',
      userId: 'user-1',
      userName: 'Lin Thit Htoo',
      resourceRoleTypeName: 'Senior Developer',
      projectId: 'project-1',
      projectCode: 'PRJ-001',
      projectName: 'Project Helix',
      entryDate: '2025-02-24',
      hours: 6,
      taskDescription: 'Frontend component development',
      isApproved: true,
      approvedAt: '2026-06-22T05:18:00',
    });
  });

  it('falls back to placeholders when the name/role fields are absent', () => {
    const result = mapTimesheetHistoryEntry(entryDto);
    expect(result.userName).toBe('Unknown user');
    expect(result.resourceRoleTypeName).toBe('');
    expect(result.projectName).toBe('Unknown project');
    expect(result.approvedAt).toBeNull();
  });
});

describe('mapTimesheetHistoryEntryList', () => {
  it('maps an array of DTOs', () => {
    const result = mapTimesheetHistoryEntryList([entryDto, { ...entryDto, Id: 'entry-2' }]);
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('entry-2');
  });

  it('returns an empty array for an empty list', () => {
    expect(mapTimesheetHistoryEntryList([])).toEqual([]);
  });
});
