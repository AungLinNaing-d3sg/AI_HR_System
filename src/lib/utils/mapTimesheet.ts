import 'server-only';

import type { TimesheetEntryDto, TimesheetPeriodDto } from '@/types/api.types';
import type { TimesheetEntry, TimesheetPeriod } from '@/types/domain.types';

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
