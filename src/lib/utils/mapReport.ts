import 'server-only';

import type {
  CostRevenueProjectDto,
  MonthlyCostRevenueResponseDto,
  TimesheetReportItemDto,
  TimesheetReportResponseDto,
  UserRolesSummaryResponseDto,
} from '@/types/api.types';
import type {
  CostRevenueProject,
  MonthlyCostRevenueReport,
  TimesheetReport,
  TimesheetReportItem,
  UserRolesSummary,
} from '@/types/domain.types';

/** Maps the backend's PascalCase Report DTOs to the app's camelCase domain models. */

function mapTimesheetReportItem(dto: TimesheetReportItemDto): TimesheetReportItem {
  return {
    user: { id: dto.User.Id, fullName: dto.User.FullName, employeeId: dto.User.EmployeeId },
    project: { id: dto.Project.Id, code: dto.Project.Code, name: dto.Project.Name },
    entryDate: dto.EntryDate,
    hours: dto.Hours,
    taskDescription: dto.TaskDescription,
    isApproved: dto.IsApproved,
  };
}

export function mapTimesheetReport(dto: TimesheetReportResponseDto): TimesheetReport {
  return {
    reportGeneratedAt: dto.ReportGeneratedAt,
    startDate: dto.StartDate,
    endDate: dto.EndDate,
    totalHours: dto.TotalHours,
    totalCount: dto.TotalCount,
    page: dto.Page,
    pageSize: dto.PageSize,
    items: dto.Items.map(mapTimesheetReportItem),
  };
}

export function mapUserRolesSummary(dto: UserRolesSummaryResponseDto): UserRolesSummary {
  return {
    startDate: dto.StartDate,
    endDate: dto.EndDate,
    grandTotalHours: dto.GrandTotalHours,
    summary: dto.Summary.map((row) => ({
      resourceRoleType: { id: row.ResourceRoleType.Id, name: row.ResourceRoleType.Name },
      totalHours: row.TotalHours,
      userCount: row.UserCount,
    })),
  };
}

function mapCostRevenueProject(dto: CostRevenueProjectDto): CostRevenueProject {
  return {
    project: { id: dto.Project.Id, code: dto.Project.Code, name: dto.Project.Name },
    totalHours: dto.TotalHours,
    totalCost: dto.TotalCost,
    totalRevenue: dto.TotalRevenue,
    margin: dto.Margin,
    breakdown: dto.Breakdown.map((row) => ({
      resourceRoleType: row.ResourceRoleType,
      hours: row.Hours,
      costRate: row.CostRate,
      billingRate: row.BillingRate,
      cost: row.Cost,
      revenue: row.Revenue,
    })),
  };
}

export function mapMonthlyCostRevenue(dto: MonthlyCostRevenueResponseDto): MonthlyCostRevenueReport {
  return {
    year: dto.Year,
    month: dto.Month,
    currency: { id: dto.Currency.Id, code: dto.Currency.Code, symbol: dto.Currency.Symbol },
    projects: dto.Projects.map(mapCostRevenueProject),
  };
}
