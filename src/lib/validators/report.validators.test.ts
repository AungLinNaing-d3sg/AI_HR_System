import {
  monthlyCostRevenueExportQuerySchema,
  monthlyCostRevenueQuerySchema,
  timesheetReportExportQuerySchema,
  timesheetReportQuerySchema,
  userRolesSummaryExportQuerySchema,
  userRolesSummaryQuerySchema,
} from './report.validators';

describe('timesheetReportQuerySchema', () => {
  it('accepts a minimal valid query (only the required date range)', () => {
    const result = timesheetReportQuerySchema.safeParse({ startDate: '2025-01-01', endDate: '2025-01-31' });
    expect(result.success).toBe(true);
  });

  it('accepts every optional field', () => {
    const result = timesheetReportQuerySchema.safeParse({
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      projectId: 'project-1',
      userId: 'user-1',
      isApproved: 'true',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing startDate', () => {
    const result = timesheetReportQuerySchema.safeParse({ endDate: '2025-01-31' });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed date', () => {
    const result = timesheetReportQuerySchema.safeParse({ startDate: '01/01/2025', endDate: '2025-01-31' });
    expect(result.success).toBe(false);
  });

  it('rejects endDate before startDate', () => {
    const result = timesheetReportQuerySchema.safeParse({ startDate: '2025-02-01', endDate: '2025-01-01' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.endDate?.[0]).toMatch(/on or after/i);
    }
  });

  it('rejects an isApproved value other than "true"/"false"', () => {
    const result = timesheetReportQuerySchema.safeParse({
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      isApproved: 'yes',
    });
    expect(result.success).toBe(false);
  });
});

describe('timesheetReportExportQuerySchema', () => {
  it('defaults format to xlsx when omitted', () => {
    const result = timesheetReportExportQuerySchema.parse({ startDate: '2025-01-01', endDate: '2025-01-31' });
    expect(result.format).toBe('xlsx');
  });

  it('accepts an explicit csv format', () => {
    const result = timesheetReportExportQuerySchema.safeParse({
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      format: 'csv',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unsupported format (e.g. pdf, which the backend does not support for this endpoint)', () => {
    const result = timesheetReportExportQuerySchema.safeParse({
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      format: 'pdf',
    });
    expect(result.success).toBe(false);
  });
});

describe('userRolesSummaryQuerySchema', () => {
  it('accepts a valid date range without projectId', () => {
    expect(userRolesSummaryQuerySchema.safeParse({ startDate: '2025-01-01', endDate: '2025-03-07' }).success).toBe(
      true
    );
  });

  it('rejects endDate before startDate', () => {
    expect(userRolesSummaryQuerySchema.safeParse({ startDate: '2025-03-07', endDate: '2025-01-01' }).success).toBe(
      false
    );
  });
});

describe('userRolesSummaryExportQuerySchema', () => {
  it('defaults format to xlsx when omitted', () => {
    const result = userRolesSummaryExportQuerySchema.parse({ startDate: '2025-01-01', endDate: '2025-01-31' });
    expect(result.format).toBe('xlsx');
  });
});

describe('monthlyCostRevenueQuerySchema', () => {
  it('coerces string year/month query values to numbers', () => {
    const result = monthlyCostRevenueQuerySchema.parse({ year: '2025', month: '3' });
    expect(result).toEqual({ year: 2025, month: 3 });
  });

  it('rejects a month outside 1-12', () => {
    expect(monthlyCostRevenueQuerySchema.safeParse({ year: '2025', month: '13' }).success).toBe(false);
  });

  it('rejects a missing year', () => {
    expect(monthlyCostRevenueQuerySchema.safeParse({ month: '3' }).success).toBe(false);
  });

  it('accepts optional projectId/currencyId', () => {
    const result = monthlyCostRevenueQuerySchema.safeParse({
      year: '2025',
      month: '3',
      projectId: 'project-1',
      currencyId: 'currency-1',
    });
    expect(result.success).toBe(true);
  });
});

describe('monthlyCostRevenueExportQuerySchema', () => {
  it('defaults format to xlsx when omitted', () => {
    const result = monthlyCostRevenueExportQuerySchema.parse({ year: '2025', month: '1' });
    expect(result.format).toBe('xlsx');
  });

  it('accepts an explicit csv format', () => {
    const result = monthlyCostRevenueExportQuerySchema.safeParse({ year: '2025', month: '1', format: 'csv' });
    expect(result.success).toBe(true);
  });
});
