import 'server-only';

import type { TimesheetEntryDto, TimesheetPeriodDto } from '@/types/api.types';
import type { TimesheetEntry, TimesheetHistoryEntry, TimesheetPeriod } from '@/types/domain.types';

/** Maps the backend's PascalCase Timesheet Period DTO to the app's camelCase domain model. */
export function mapTimesheetPeriod(dto: TimesheetPeriodDto): TimesheetPeriod {
  return {
    id: dto.Id,
    periodStart: dto.PeriodStart,
    periodEnd: dto.PeriodEnd,
    isLocked: dto.IsLocked,
  };
}

export function mapTimesheetPeriodList(dtos: TimesheetPeriodDto[]): TimesheetPeriod[] {
  return dtos.map(mapTimesheetPeriod);
}

/** Maps the backend's PascalCase Timesheet Entry DTO to the app's camelCase domain model. */
export function mapTimesheetEntry(dto: TimesheetEntryDto): TimesheetEntry {
  return {
    id: dto.Id,
    projectId: dto.ProjectId,
    timesheetPeriodId: dto.TimesheetPeriodId,
    entryDate: dto.EntryDate,
    hours: dto.Hours,
    taskDescription: dto.TaskDescription,
    isApproved: dto.IsApproved,
  };
}

export function mapTimesheetEntryList(dtos: TimesheetEntryDto[]): TimesheetEntry[] {
  return dtos.map(mapTimesheetEntry);
}

/**
 * Maps a `GetAllTimesheetEntries` DTO to the denormalized shape the
 * `/timesheets/history` table renders. Only that endpoint (not
 * `CreateTimesheetEntry`/`UpdateTimesheetEntry`) returns the
 * `UserFirstName`/`ProjectName`/etc. fields this depends on.
 */
export function mapTimesheetHistoryEntry(dto: TimesheetEntryDto): TimesheetHistoryEntry {
  return {
    id: dto.Id,
    userId: dto.UserId,
    userName: [dto.UserFirstName, dto.UserLastName].filter(Boolean).join(' ') || 'Unknown user',
    resourceRoleTypeName: dto.ResourceRoleTypeName ?? '',
    projectId: dto.ProjectId,
    projectCode: dto.ProjectCode ?? '',
    projectName: dto.ProjectName ?? 'Unknown project',
    entryDate: dto.EntryDate,
    hours: dto.Hours,
    taskDescription: dto.TaskDescription,
    isApproved: dto.IsApproved,
    approvedAt: dto.ApprovedAt ?? null,
  };
}

export function mapTimesheetHistoryEntryList(dtos: TimesheetEntryDto[]): TimesheetHistoryEntry[] {
  return dtos.map(mapTimesheetHistoryEntry);
}
