import {
  createTimesheetEntrySchema,
  taskDescriptionSchema,
  timesheetCellSchema,
  timesheetHoursSchema,
  updateTimesheetEntrySchema,
} from './timesheet.validators';

describe('timesheetHoursSchema', () => {
  it('accepts a valid decimal hours value', () => {
    expect(timesheetHoursSchema.parse('7.5')).toBe(7.5);
  });

  it('treats an empty string as 0 hours', () => {
    expect(timesheetHoursSchema.parse('')).toBe(0);
  });

  it('rejects a negative value', () => {
    expect(timesheetHoursSchema.safeParse('-1').success).toBe(false);
  });

  it('rejects a value above the daily maximum', () => {
    expect(timesheetHoursSchema.safeParse('25').success).toBe(false);
  });

  it('rejects a non-numeric value', () => {
    expect(timesheetHoursSchema.safeParse('abc').success).toBe(false);
  });
});

describe('taskDescriptionSchema', () => {
  it('accepts an empty string', () => {
    expect(taskDescriptionSchema.parse('')).toBe('');
  });

  it('trims whitespace', () => {
    expect(taskDescriptionSchema.parse('  Bug fixes  ')).toBe('Bug fixes');
  });

  it('rejects a description longer than the max length', () => {
    expect(taskDescriptionSchema.safeParse('a'.repeat(501)).success).toBe(false);
  });
});

describe('timesheetCellSchema', () => {
  it('validates a full cell edit', () => {
    const result = timesheetCellSchema.safeParse({ hours: '6', taskDescription: 'API integration testing' });
    expect(result.success).toBe(true);
  });

  it('fails when hours are out of range', () => {
    const result = timesheetCellSchema.safeParse({ hours: '30', taskDescription: '' });
    expect(result.success).toBe(false);
  });
});

describe('createTimesheetEntrySchema', () => {
  const validPayload = {
    projectId: 'project-1',
    timesheetPeriodId: 'period-1',
    entryDate: '2025-02-24',
    hours: '6',
    taskDescription: 'Frontend component development',
  };

  it('accepts a valid payload', () => {
    expect(createTimesheetEntrySchema.safeParse(validPayload).success).toBe(true);
  });

  it('rejects a missing projectId', () => {
    const result = createTimesheetEntrySchema.safeParse({ ...validPayload, projectId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed entryDate', () => {
    const result = createTimesheetEntrySchema.safeParse({ ...validPayload, entryDate: '24-02-2025' });
    expect(result.success).toBe(false);
  });
});

describe('updateTimesheetEntrySchema', () => {
  it('accepts a valid payload without project/date fields', () => {
    const result = updateTimesheetEntrySchema.safeParse({ hours: '4', taskDescription: 'Updated notes' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid hours', () => {
    const result = updateTimesheetEntrySchema.safeParse({ hours: '-2', taskDescription: '' });
    expect(result.success).toBe(false);
  });
});
