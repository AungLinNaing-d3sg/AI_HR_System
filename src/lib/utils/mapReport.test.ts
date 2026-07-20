import { mapMonthlyCostRevenue, mapTimesheetReport, mapUserRolesSummary } from './mapReport';
import type {
  MonthlyCostRevenueResponseDto,
  TimesheetReportResponseDto,
  UserRolesSummaryResponseDto,
} from '@/types/api.types';

describe('mapTimesheetReport', () => {
  it('maps the PascalCase DTO (including nested User/Project) to the camelCase domain model', () => {
    const dto: TimesheetReportResponseDto = {
      ReportGeneratedAt: '2026-06-22T05:37:30.222Z',
      StartDate: '2025-01-01',
      EndDate: '2026-01-31',
      TotalHours: 6,
      TotalCount: 1,
      Page: 1,
      PageSize: 100,
      Items: [
        {
          User: { Id: 'user-1', FullName: 'Lin Thit Htoo', EmployeeId: 'EMP003' },
          Project: { Id: 'project-1', Code: 'PRJ-001', Name: 'Project Helix' },
          EntryDate: '2025-03-01',
          Hours: 6,
          TaskDescription: 'Updated task description',
          IsApproved: true,
        },
      ],
    };

    expect(mapTimesheetReport(dto)).toEqual({
      reportGeneratedAt: '2026-06-22T05:37:30.222Z',
      startDate: '2025-01-01',
      endDate: '2026-01-31',
      totalHours: 6,
      totalCount: 1,
      page: 1,
      pageSize: 100,
      items: [
        {
          user: { id: 'user-1', fullName: 'Lin Thit Htoo', employeeId: 'EMP003' },
          project: { id: 'project-1', code: 'PRJ-001', name: 'Project Helix' },
          entryDate: '2025-03-01',
          hours: 6,
          taskDescription: 'Updated task description',
          isApproved: true,
        },
      ],
    });
  });

  it('maps an empty Items list to an empty items array', () => {
    const dto: TimesheetReportResponseDto = {
      ReportGeneratedAt: '2026-06-22T05:37:30.222Z',
      StartDate: '2025-01-01',
      EndDate: '2025-01-31',
      TotalHours: 0,
      TotalCount: 0,
      Page: 1,
      PageSize: 100,
      Items: [],
    };
    expect(mapTimesheetReport(dto).items).toEqual([]);
  });
});

describe('mapUserRolesSummary', () => {
  it('maps the PascalCase DTO to the camelCase domain model', () => {
    const dto: UserRolesSummaryResponseDto = {
      StartDate: '2025-01-01',
      EndDate: '2025-03-07',
      Summary: [
        {
          ResourceRoleType: { Id: 'role-1', Name: 'Senior Developer' },
          TotalHours: 24,
          UserCount: 1,
        },
      ],
      GrandTotalHours: 24,
    };

    expect(mapUserRolesSummary(dto)).toEqual({
      startDate: '2025-01-01',
      endDate: '2025-03-07',
      grandTotalHours: 24,
      summary: [{ resourceRoleType: { id: 'role-1', name: 'Senior Developer' }, totalHours: 24, userCount: 1 }],
    });
  });
});

describe('mapMonthlyCostRevenue', () => {
  it('maps the PascalCase DTO (including nested Currency/Project/Breakdown) to the camelCase domain model', () => {
    const dto: MonthlyCostRevenueResponseDto = {
      Year: 2025,
      Month: 3,
      Currency: { Id: 'currency-1', Code: 'SGD', Symbol: 'S$' },
      Projects: [
        {
          Project: { Id: 'project-1', Code: 'PRJ-001', Name: 'Project Helix' },
          TotalHours: 24,
          TotalCost: 600,
          TotalRevenue: 1800,
          Margin: 1200,
          Breakdown: [
            {
              ResourceRoleType: 'Senior Developer',
              Hours: 24,
              CostRate: 25,
              BillingRate: 75,
              Cost: 600,
              Revenue: 1800,
            },
          ],
        },
      ],
    };

    expect(mapMonthlyCostRevenue(dto)).toEqual({
      year: 2025,
      month: 3,
      currency: { id: 'currency-1', code: 'SGD', symbol: 'S$' },
      projects: [
        {
          project: { id: 'project-1', code: 'PRJ-001', name: 'Project Helix' },
          totalHours: 24,
          totalCost: 600,
          totalRevenue: 1800,
          margin: 1200,
          breakdown: [
            { resourceRoleType: 'Senior Developer', hours: 24, costRate: 25, billingRate: 75, cost: 600, revenue: 1800 },
          ],
        },
      ],
    });
  });
});
