import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { UserRolesSummaryTable } from './UserRolesSummaryTable';
import type { UserRolesSummary } from '@/types/domain.types';

jest.mock('../../lib/api/reports.api', () => ({
  getUserRolesSummary: jest.fn(),
  exportUserRolesSummary: jest.fn(),
}));

const reportsApi = jest.requireMock('../../lib/api/reports.api') as {
  getUserRolesSummary: jest.Mock;
  exportUserRolesSummary: jest.Mock;
};

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
    reportsApi.getUserRolesSummary.mockReset();
    reportsApi.exportUserRolesSummary.mockReset();
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
});
