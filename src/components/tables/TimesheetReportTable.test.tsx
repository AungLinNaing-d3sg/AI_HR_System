import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { TimesheetReportTable } from './TimesheetReportTable';
import type { Project } from '@/types/domain.types';
import type { TimesheetReport } from '@/types/domain.types';

// `useProjectFilterOptions` (via `useAuth`) calls `useRouter()` from
// `next/navigation` - stub it the same way `GenerateInvoiceForm.test.tsx`
// does, since there's no mounted Next.js App Router in this unit test.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

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
    expect(screen.getByText(/total hours/i)).toBeInTheDocument();
  });

  it('shows only the project name (no project code) in the Project column', async () => {
    reportsApi.getTimesheetReport.mockResolvedValue(report);
    renderWithProviders(<TimesheetReportTable />);

    await screen.findByRole('cell', { name: 'Alex Kumar' });
    expect(screen.queryByText('PRJ-ALPHA')).not.toBeInTheDocument();
    expect(screen.queryByText(/PRJ-ALPHA/)).not.toBeInTheDocument();
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

  // Regression check for the interaction between this table's new server-side
  // pagination and its pre-existing client-side "User" filter: the backend
  // now only ever returns one page of `items` (`DEFAULT_PAGE_SIZE` = 20), but
  // `getUserOptions`/`filteredItems` still only look at that one page instead
  // of the full, multi-page report - so a user whose entries fall on another
  // page never appears in the "User" dropdown, and the report's headline
  // "Total hours" figure (report-wide) is shown alongside a page that cannot
  // filter down to the user it's supposedly reporting on.
  it('only offers users present on the currently loaded report page in the User filter, even when the full report spans multiple pages', async () => {
    const multiPageReport: TimesheetReport = {
      ...report,
      totalCount: 25,
      pageSize: 20,
      items: Array.from({ length: 20 }, (_, index) => ({
        user: { id: 'user-1', fullName: 'Alex Kumar', employeeId: 'EMP001' },
        project: { id: 'project-1', code: 'PRJ-ALPHA', name: 'Project Alpha' },
        entryDate: '2025-02-24',
        hours: 1,
        taskDescription: `Entry ${index}`,
        isApproved: true,
      })),
    };
    reportsApi.getTimesheetReport.mockResolvedValue(multiPageReport);
    renderWithProviders(<TimesheetReportTable />);

    await screen.findAllByText('Alex Kumar');

    // Page 2 (not fetched by this component at all up front) has a second
    // user, "Jamie Lee", who has no way of showing up in the dropdown below.
    const userSelect = screen.getByLabelText('User') as HTMLSelectElement;
    const optionLabels = Array.from(userSelect.options).map((option) => option.text);
    expect(optionLabels).toEqual(['All Users', 'Alex Kumar']);
    expect(optionLabels).not.toContain('Jamie Lee');
  });
});
