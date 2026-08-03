import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { UserRolesSummaryTable } from './UserRolesSummaryTable';
import type { Project, UserRolesSummary } from '@/types/domain.types';

// `useProjectFilterOptions` (via `useAuth`) calls `useRouter()` from
// `next/navigation` - stub it the same way `TimesheetReportTable.test.tsx`
// does, since there's no mounted Next.js App Router in this unit test.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../../lib/api/projects.api', () => ({
  getProjects: jest.fn(),
}));
jest.mock('../../lib/api/reports.api', () => ({
  getUserRolesSummary: jest.fn(),
  exportUserRolesSummary: jest.fn(),
}));

const projectsApi = jest.requireMock('../../lib/api/projects.api') as { getProjects: jest.Mock };
const reportsApi = jest.requireMock('../../lib/api/reports.api') as {
  getUserRolesSummary: jest.Mock;
  exportUserRolesSummary: jest.Mock;
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

const summary: UserRolesSummary = {
  startDate: '2025-02-01',
  endDate: '2025-02-28',
  grandTotalHours: 24,
  summary: [{ resourceRoleType: { id: 'role-1', name: 'Senior Developer' }, totalHours: 24, userCount: 1 }],
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('UserRolesSummaryTable', () => {
  beforeEach(() => {
    projectsApi.getProjects.mockReset();
    reportsApi.getUserRolesSummary.mockReset();
    reportsApi.exportUserRolesSummary.mockReset();
    projectsApi.getProjects.mockResolvedValue(projects);
  });

  it('shows a loading state initially', () => {
    reportsApi.getUserRolesSummary.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<UserRolesSummaryTable />);
    expect(screen.getByText(/generating summary/i)).toBeInTheDocument();
  });

  it('shows an error state with a retry action on failure', async () => {
    reportsApi.getUserRolesSummary.mockRejectedValue(new Error('network down'));
    renderWithProviders(<UserRolesSummaryTable />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows an empty state when there are no rows', async () => {
    reportsApi.getUserRolesSummary.mockResolvedValue({ ...summary, summary: [], grandTotalHours: 0 });
    renderWithProviders(<UserRolesSummaryTable />);

    expect(await screen.findByText(/no timesheet hours were logged/i)).toBeInTheDocument();
  });

  it('renders the summary table, total row, and Hours by Role side panel', async () => {
    reportsApi.getUserRolesSummary.mockResolvedValue(summary);
    renderWithProviders(<UserRolesSummaryTable />);

    expect(await screen.findAllByText('Senior Developer')).not.toHaveLength(0);
    expect(screen.getByText('Hours by Role')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getAllByText('24h').length).toBeGreaterThan(0);
  });

  it('exports the summary when an export button is clicked', async () => {
    const user = userEvent.setup();
    reportsApi.getUserRolesSummary.mockResolvedValue(summary);
    reportsApi.exportUserRolesSummary.mockResolvedValue(undefined);
    renderWithProviders(<UserRolesSummaryTable />);
    await screen.findAllByText('Senior Developer');

    await user.click(screen.getByRole('button', { name: /export excel/i }));

    expect(reportsApi.exportUserRolesSummary).toHaveBeenCalledWith(expect.any(Object), 'xlsx');
  });

  it('renders the Project filter populated from useProjectFilterOptions, defaulting to "All Projects"', async () => {
    reportsApi.getUserRolesSummary.mockResolvedValue(summary);
    renderWithProviders(<UserRolesSummaryTable />);
    await screen.findAllByText('Senior Developer');

    const projectSelect = screen.getByLabelText('Project') as HTMLSelectElement;
    expect(projectSelect).toHaveValue('all');
    expect(screen.getByRole('option', { name: 'Project Alpha' })).toBeInTheDocument();
  });

  it('applies the selected Project as a projectId filter when Apply Filters is clicked', async () => {
    const user = userEvent.setup();
    reportsApi.getUserRolesSummary.mockResolvedValue(summary);
    renderWithProviders(<UserRolesSummaryTable />);
    await screen.findAllByText('Senior Developer');

    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.click(screen.getByRole('button', { name: /apply filters/i }));

    await waitFor(() =>
      expect(reportsApi.getUserRolesSummary).toHaveBeenLastCalledWith(
        expect.objectContaining({ projectId: 'project-1' })
      )
    );
  });

  it('forwards the applied Project filter to the export request', async () => {
    const user = userEvent.setup();
    reportsApi.getUserRolesSummary.mockResolvedValue(summary);
    reportsApi.exportUserRolesSummary.mockResolvedValue(undefined);
    renderWithProviders(<UserRolesSummaryTable />);
    await screen.findAllByText('Senior Developer');

    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.click(screen.getByRole('button', { name: /apply filters/i }));
    await waitFor(() =>
      expect(reportsApi.getUserRolesSummary).toHaveBeenLastCalledWith(
        expect.objectContaining({ projectId: 'project-1' })
      )
    );

    await user.click(screen.getByRole('button', { name: /export excel/i }));

    expect(reportsApi.exportUserRolesSummary).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'project-1' }),
      'xlsx'
    );
  });

  it('resets the Project filter (and date range) back to defaults when Reset is clicked', async () => {
    const user = userEvent.setup();
    reportsApi.getUserRolesSummary.mockResolvedValue(summary);
    renderWithProviders(<UserRolesSummaryTable />);
    await screen.findAllByText('Senior Developer');

    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.click(screen.getByRole('button', { name: /apply filters/i }));
    await waitFor(() =>
      expect(reportsApi.getUserRolesSummary).toHaveBeenLastCalledWith(
        expect.objectContaining({ projectId: 'project-1' })
      )
    );

    const callsBeforeReset = reportsApi.getUserRolesSummary.mock.calls.length;
    await user.click(screen.getByRole('button', { name: /reset/i }));

    expect(screen.getByLabelText('Project')).toHaveValue('all');
    await waitFor(() =>
      expect(reportsApi.getUserRolesSummary.mock.calls.length).toBeGreaterThan(callsBeforeReset)
    );
    const lastCallFilters = reportsApi.getUserRolesSummary.mock.calls.at(-1)?.[0];
    expect(lastCallFilters.projectId).toBeUndefined();
  });
});
