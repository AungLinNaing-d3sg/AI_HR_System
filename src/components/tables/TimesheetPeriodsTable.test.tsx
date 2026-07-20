import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { TimesheetPeriodsTable } from './TimesheetPeriodsTable';
import type { TimesheetPeriod } from '@/types/domain.types';

jest.mock('../../lib/api/timesheets.api', () => ({
  getTimesheetPeriods: jest.fn(),
}));

const timesheetsApi = jest.requireMock('../../lib/api/timesheets.api') as { getTimesheetPeriods: jest.Mock };

const periods: TimesheetPeriod[] = [
  { id: 'period-1', periodStart: '2026-03-01', periodEnd: '2026-05-15', isLocked: false },
  { id: 'period-2', periodStart: '2026-01-01', periodEnd: '2026-02-28', isLocked: true },
];

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('TimesheetPeriodsTable', () => {
  beforeEach(() => {
    timesheetsApi.getTimesheetPeriods.mockReset();
  });

  it('shows a loading state initially', () => {
    timesheetsApi.getTimesheetPeriods.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<TimesheetPeriodsTable />);
    expect(screen.getByText(/loading timesheet periods/i)).toBeInTheDocument();
  });

  it('shows an error state with a retry action when the list fails to load', async () => {
    timesheetsApi.getTimesheetPeriods.mockRejectedValue(new Error('network down'));
    renderWithProviders(<TimesheetPeriodsTable />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows an empty state when there are no periods', async () => {
    timesheetsApi.getTimesheetPeriods.mockResolvedValue([]);
    renderWithProviders(<TimesheetPeriodsTable />);
    expect(await screen.findByText(/no timesheet periods have been created yet/i)).toBeInTheDocument();
  });

  it('renders each period with its Locked/Unlocked status', async () => {
    timesheetsApi.getTimesheetPeriods.mockResolvedValue(periods);
    renderWithProviders(<TimesheetPeriodsTable />);

    expect(await screen.findByText('Unlocked')).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(screen.getByText('Mar 1, 2026')).toBeInTheDocument();
    expect(screen.getByText('May 15, 2026')).toBeInTheDocument();
  });
});
