import { buildTimesheetGrid, calculateDailyTotals } from './timesheetGrid';
import type { Project, TimesheetEntry } from '@/types/domain.types';

const activeProject: Project = {
  id: 'project-1',
  code: 'PRJ-ALPHA',
  name: 'Project Alpha - Web Platform',
  description: null,
  clientName: 'Acme Corp',
  clientEmail: null,
  startDate: null,
  endDate: null,
  maxDailyHours: null,
  isActive: true,
};

const secondActiveProject: Project = {
  ...activeProject,
  id: 'project-2',
  code: 'PRJ-BETA',
  name: 'Project Beta - Mobile App',
  clientName: 'TechStart Inc',
};

const inactiveProject: Project = {
  ...activeProject,
  id: 'project-3',
  code: 'PRJ-GAMMA',
  name: 'Project Gamma - Archived',
  isActive: false,
};

const weekStart = '2025-02-24';

function makeEntry(overrides: Partial<TimesheetEntry>): TimesheetEntry {
  return {
    id: 'entry-1',
    projectId: 'project-1',
    timesheetPeriodId: 'period-1',
    entryDate: '2025-02-24',
    hours: 6,
    taskDescription: 'Frontend component development',
    isApproved: false,
    ...overrides,
  };
}

describe('buildTimesheetGrid', () => {
  it('builds one row per active project, excluding inactive projects', () => {
    const rows = buildTimesheetGrid([activeProject, inactiveProject], [], weekStart);
    expect(rows).toHaveLength(1);
    expect(rows[0].projectId).toBe('project-1');
  });

  it('produces 7 Monday-first cells per row, blank when there is no entry', () => {
    const rows = buildTimesheetGrid([activeProject], [], weekStart);
    expect(rows[0].cells).toHaveLength(7);
    expect(rows[0].cells[0].date).toBe('2025-02-24');
    expect(rows[0].cells[6].date).toBe('2025-03-02');
    expect(rows[0].cells.every((cell) => cell.hours === 0 && cell.entryId === null)).toBe(true);
  });

  it('fills a cell from the matching entry by project + date', () => {
    const entry = makeEntry({ entryDate: '2025-02-25', hours: 7.5 });
    const rows = buildTimesheetGrid([activeProject], [entry], weekStart);
    const tuesdayCell = rows[0].cells[1];
    expect(tuesdayCell.hours).toBe(7.5);
    expect(tuesdayCell.entryId).toBe('entry-1');
    expect(tuesdayCell.taskDescription).toBe('Frontend component development');
  });

  it('ignores entries for dates outside the given week', () => {
    const outOfRangeEntry = makeEntry({ entryDate: '2025-03-10', hours: 4 });
    const rows = buildTimesheetGrid([activeProject], [outOfRangeEntry], weekStart);
    expect(rows[0].totalHours).toBe(0);
  });

  it('sums each row total across the week', () => {
    const entries = [
      makeEntry({ id: 'e1', entryDate: '2025-02-24', hours: 6 }),
      makeEntry({ id: 'e2', entryDate: '2025-02-25', hours: 7 }),
      makeEntry({ id: 'e3', entryDate: '2025-02-26', hours: 8 }),
    ];
    const rows = buildTimesheetGrid([activeProject], entries, weekStart);
    expect(rows[0].totalHours).toBe(21);
  });

  it('carries through isApproved so locked cells can be disabled', () => {
    const entry = makeEntry({ entryDate: '2025-02-24', isApproved: true });
    const rows = buildTimesheetGrid([activeProject], [entry], weekStart);
    expect(rows[0].cells[0].isApproved).toBe(true);
  });

  it('returns an empty array when there are no active projects', () => {
    expect(buildTimesheetGrid([inactiveProject], [], weekStart)).toEqual([]);
  });
});

describe('calculateDailyTotals', () => {
  it('sums hours across all rows for each of the 7 days', () => {
    const rows = buildTimesheetGrid(
      [activeProject, secondActiveProject],
      [
        makeEntry({ id: 'e1', projectId: 'project-1', entryDate: '2025-02-24', hours: 6 }),
        makeEntry({ id: 'e2', projectId: 'project-2', entryDate: '2025-02-24', hours: 2 }),
        makeEntry({ id: 'e3', projectId: 'project-1', entryDate: '2025-02-25', hours: 7 }),
        makeEntry({ id: 'e4', projectId: 'project-2', entryDate: '2025-02-25', hours: 1 }),
      ],
      weekStart
    );

    expect(calculateDailyTotals(rows, weekStart)).toEqual([8, 8, 0, 0, 0, 0, 0]);
  });

  it('returns all zeros when there are no rows', () => {
    expect(calculateDailyTotals([], weekStart)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});
