import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { CostRevenueTable } from './CostRevenueTable';
import type { MonthlyCostRevenueReport, Project } from '@/types/domain.types';

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
  getMonthlyCostRevenue: jest.fn(),
  exportMonthlyCostRevenue: jest.fn(),
}));

const projectsApi = jest.requireMock('../../lib/api/projects.api') as { getProjects: jest.Mock };
const reportsApi = jest.requireMock('../../lib/api/reports.api') as {
  getMonthlyCostRevenue: jest.Mock;
  exportMonthlyCostRevenue: jest.Mock;
};

const projects: Project[] = [
  {
    id: 'project-1',
    code: 'PRJ-001',
    name: 'Project Helix',
    description: null,
    clientName: 'Acme Corp',
    clientEmail: null,
    startDate: null,
    endDate: null,
    maxDailyHours: null,
    isActive: true,
  },
];

const report: MonthlyCostRevenueReport = {
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
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CostRevenueTable', () => {
  beforeEach(() => {
    projectsApi.getProjects.mockReset();
    reportsApi.getMonthlyCostRevenue.mockReset();
    reportsApi.exportMonthlyCostRevenue.mockReset();
    projectsApi.getProjects.mockResolvedValue(projects);
  });

  it('shows a loading state initially', () => {
    reportsApi.getMonthlyCostRevenue.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<CostRevenueTable />);
    expect(screen.getByText(/generating report/i)).toBeInTheDocument();
  });

  it('shows an error state with a retry action on failure', async () => {
    reportsApi.getMonthlyCostRevenue.mockRejectedValue(new Error('network down'));
    renderWithProviders(<CostRevenueTable />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows an empty state when there is no project activity', async () => {
    reportsApi.getMonthlyCostRevenue.mockResolvedValue({ ...report, projects: [] });
    renderWithProviders(<CostRevenueTable />);

    expect(await screen.findByText(/no cost\/revenue activity/i)).toBeInTheDocument();
  });

  it('renders KPI cards, the cost/revenue table, and the Cost vs Revenue chart panel', async () => {
    reportsApi.getMonthlyCostRevenue.mockResolvedValue(report);
    renderWithProviders(<CostRevenueTable />);

    expect(await screen.findByText('Total Hours')).toBeInTheDocument();
    expect(screen.getByText('Total Cost')).toBeInTheDocument();
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getAllByText(/project helix/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Senior Developer')).toBeInTheDocument();
    expect(screen.getByText('Cost vs Revenue')).toBeInTheDocument();
    expect(screen.getByText(/margin/i)).toBeInTheDocument();
  });

  it('shows only the project name (no project code) in the Project column', async () => {
    reportsApi.getMonthlyCostRevenue.mockResolvedValue(report);
    renderWithProviders(<CostRevenueTable />);

    expect(await screen.findByText('Senior Developer')).toBeInTheDocument();
    expect(screen.queryByText('PRJ-001')).not.toBeInTheDocument();
    expect(screen.queryByText(/PRJ-001/)).not.toBeInTheDocument();
  });

  it('exports the report when an export button is clicked', async () => {
    const user = userEvent.setup();
    reportsApi.getMonthlyCostRevenue.mockResolvedValue(report);
    reportsApi.exportMonthlyCostRevenue.mockResolvedValue(undefined);
    renderWithProviders(<CostRevenueTable />);
    await screen.findByText('Total Hours');

    await user.click(screen.getByRole('button', { name: /export csv/i }));

    expect(reportsApi.exportMonthlyCostRevenue).toHaveBeenCalledWith(expect.any(Object), 'csv');
  });
});
