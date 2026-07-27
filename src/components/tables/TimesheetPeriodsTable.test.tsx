import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { TimesheetPeriodsTable } from './TimesheetPeriodsTable';
import type { TimesheetPeriod } from '@/types/domain.types';

jest.mock('../../lib/api/timesheets.api', () => ({
  getTimesheetPeriods: jest.fn(),
  deleteTimesheetPeriod: jest.fn(),
  lockTimesheetPeriod: jest.fn(),
  unlockTimesheetPeriod: jest.fn(),
}));

const timesheetsApi = jest.requireMock('../../lib/api/timesheets.api') as {
  getTimesheetPeriods: jest.Mock;
  deleteTimesheetPeriod: jest.Mock;
  lockTimesheetPeriod: jest.Mock;
  unlockTimesheetPeriod: jest.Mock;
};

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
    timesheetsApi.deleteTimesheetPeriod.mockReset();
    timesheetsApi.lockTimesheetPeriod.mockReset();
    timesheetsApi.unlockTimesheetPeriod.mockReset();
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

  it('renders each period with its Locked/Unlocked status and the matching Lock/Unlock action', async () => {
    timesheetsApi.getTimesheetPeriods.mockResolvedValue(periods);
    renderWithProviders(<TimesheetPeriodsTable />);

    expect(await screen.findByText('Unlocked')).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(screen.getByText('Mar 1, 2026')).toBeInTheDocument();
    expect(screen.getByText('May 15, 2026')).toBeInTheDocument();

    const rows = screen.getAllByRole('row').slice(1); // skip header row
    expect(within(rows[0]).getByRole('button', { name: /^lock$/i })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('button', { name: /^unlock$/i })).toBeInTheDocument();
  });

  it('locks a period after confirming in the dialog', async () => {
    const user = userEvent.setup();
    timesheetsApi.getTimesheetPeriods.mockResolvedValue(periods);
    timesheetsApi.lockTimesheetPeriod.mockResolvedValue({
      id: 'period-1',
      isLocked: true,
      lockedAt: '2026-06-22T01:26:23.930Z',
    });
    renderWithProviders(<TimesheetPeriodsTable />);

    await screen.findByText('Unlocked');
    await user.click(screen.getByRole('button', { name: /^lock$/i }));

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^lock$/i }));

    await waitFor(() => expect(timesheetsApi.lockTimesheetPeriod).toHaveBeenCalledWith('period-1'));
  });

  it('unlocks a period directly without a confirmation dialog', async () => {
    const user = userEvent.setup();
    timesheetsApi.getTimesheetPeriods.mockResolvedValue(periods);
    timesheetsApi.unlockTimesheetPeriod.mockResolvedValue({ id: 'period-2', isLocked: false });
    renderWithProviders(<TimesheetPeriodsTable />);

    await screen.findByText('Locked');
    await user.click(screen.getByRole('button', { name: /^unlock$/i }));

    await waitFor(() => expect(timesheetsApi.unlockTimesheetPeriod).toHaveBeenCalledWith('period-2'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('deletes a period after confirming in the dialog', async () => {
    const user = userEvent.setup();
    timesheetsApi.getTimesheetPeriods.mockResolvedValue(periods);
    timesheetsApi.deleteTimesheetPeriod.mockResolvedValue(undefined);
    renderWithProviders(<TimesheetPeriodsTable />);

    await screen.findByText('Unlocked');
    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i });
    await user.click(deleteButtons[0]);

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(timesheetsApi.deleteTimesheetPeriod).toHaveBeenCalledWith('period-1'));
  });

  it('surfaces an error message when deleting a period fails', async () => {
    const user = userEvent.setup();
    timesheetsApi.getTimesheetPeriods.mockResolvedValue(periods);
    timesheetsApi.deleteTimesheetPeriod.mockRejectedValue(new Error('This period has existing timesheet entries.'));
    renderWithProviders(<TimesheetPeriodsTable />);

    await screen.findByText('Unlocked');
    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i });
    await user.click(deleteButtons[0]);

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    // `getApiErrorMessage` only extracts a real message off an `AxiosError`;
    // a generic `Error` (as thrown here) falls back to this hook's own
    // fallback copy - see `useDeleteTimesheetPeriod`.
    expect(await screen.findByText('Could not delete this timesheet period.')).toBeInTheDocument();
  });
});
