import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { TimesheetReportTable } from './TimesheetReportTable';
import type { Project } from '@/types/domain.types';
import type { TimesheetReport } from '@/types/domain.types';

jest.mock('../../lib/api/projects.api', () => ({
  getProjects: jest.fn(),
}));
jest.mock('../../lib/api/reports.api', () => ({
  getTimesheetReport: jest.fn(),
  exportTimesheetReport: jest.fn(),
}));

const projectsApi = jest.requireMock('../../lib/api/projects.api') as { getProjects: jest.Mock };
const reportsApi = jest.requireMock('../../lib/api/reports.api') as {
  getTimesheetReport: jest.Mock;
  exportTimesheetReport: jest.Mock;
};

const projects: Project[] = [
  {
    id: 'project-1',
    code: 'PRJ-ALPHA',
    name: 'Project Alpha',
    description: null,
    clientName: 'Acme Corp',
    clientEmail: null,
    startDate: null,
    endDate: null,
    maxDailyHours: null,
    isActive: true,
  },
];

const report: TimesheetReport = {
  reportGeneratedAt: '2026-06-22T00:00:00.000Z',
  startDate: '2025-02-01',
  endDate: '2025-02-28',
  totalHours: 6,
  totalCount: 1,
  page: 1,
  pageSize: 500,
  items: [
    {
      user: { id: 'user-1', fullName: 'Alex Kumar', employeeId: 'EMP001' },
      project: { id: 'project-1', code: 'PRJ-ALPHA', name: 'Project Alpha' },
      entryDate: '2025-02-24',
      hours: 6,
      taskDescription: 'Frontend component development',
      isApproved: true,
    },
  ],
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('TimesheetReportTable', () => {
  beforeEach(() => {
    projectsApi.getProjects.mockReset();
    reportsApi.getTimesheetReport.mockReset();
    reportsApi.exportTimesheetReport.mockReset();
    projectsApi.getProjects.mockResolvedValue(projects);
  });

  it('shows a loading state initially', () => {
    reportsApi.getTimesheetReport.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<TimesheetReportTable />);
    expect(screen.getByText(/generating report/i)).toBeInTheDocument();
  });

  it('shows an error state with a retry action when the report fails to generate', async () => {
    reportsApi.getTimesheetReport.mockRejectedValue(new Error('network down'));
    renderWithProviders(<TimesheetReportTable />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows an empty state when there are no entries', async () => {
    reportsApi.getTimesheetReport.mockResolvedValue({ ...report, items: [] });
    renderWithProviders(<TimesheetReportTable />);

    expect(await screen.findByText(/no timesheet entries match these filters/i)).toBeInTheDocument();
  });

  it('renders report rows and the total hours summary', async () => {
    reportsApi.getTimesheetReport.mockResolvedValue(report);
    renderWithProviders(<TimesheetReportTable />);

    await screen.findByRole('cell', { name: 'Alex Kumar' });
    const table = screen.getByRole('table');
    expect(within(table).getByText('Project Alpha')).toBeInTheDocument();
    expect(within(table).getByText('Frontend component development')).toBeInTheDocument();
    expect(within(table).getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText(/total hours:/i)).toBeInTheDocument();
  });

  it('shows a validation error when Date From is after Date To', async () => {
    const user = userEvent.setup();
    reportsApi.getTimesheetReport.mockResolvedValue(report);
    renderWithProviders(<TimesheetReportTable />);
    await screen.findByRole('cell', { name: 'Alex Kumar' });

    await user.clear(screen.getByLabelText('Date From'));
    await user.type(screen.getByLabelText('Date From'), '2025-03-01');
    await user.clear(screen.getByLabelText('Date To'));
    await user.type(screen.getByLabelText('Date To'), '2025-01-01');
    await user.click(screen.getByRole('button', { name: /apply filters/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/date from.*on or before.*date to/i);
  });

  it('exports the report when an export button is clicked', async () => {
    const user = userEvent.setup();
    reportsApi.getTimesheetReport.mockResolvedValue(report);
    reportsApi.exportTimesheetReport.mockResolvedValue(undefined);
    renderWithProviders(<TimesheetReportTable />);
    await screen.findByRole('cell', { name: 'Alex Kumar' });

    await user.click(screen.getByRole('button', { name: /export csv/i }));

    await waitFor(() => expect(reportsApi.exportTimesheetReport).toHaveBeenCalledWith(expect.any(Object), 'csv'));
  });
});
