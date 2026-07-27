import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { TimesheetPeriodForm } from './TimesheetPeriodForm';

jest.mock('../../lib/api/timesheets.api', () => ({
  createTimesheetPeriod: jest.fn(),
}));

const timesheetsApi = jest.requireMock('../../lib/api/timesheets.api') as { createTimesheetPeriod: jest.Mock };

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('TimesheetPeriodForm', () => {
  beforeEach(() => {
    timesheetsApi.createTimesheetPeriod.mockReset();
  });

  it('shows validation errors instead of submitting when fields are empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TimesheetPeriodForm />);

    await user.click(screen.getByRole('button', { name: /create period/i }));

    expect(await screen.findAllByText(/enter a valid date/i)).not.toHaveLength(0);
    expect(timesheetsApi.createTimesheetPeriod).not.toHaveBeenCalled();
  });

  it('submits valid dates and shows a success message', async () => {
    timesheetsApi.createTimesheetPeriod.mockResolvedValue({
      id: 'period-1',
      periodStart: '2026-03-01',
      periodEnd: '2026-05-15',
      isLocked: false,
    });
    const user = userEvent.setup();
    renderWithProviders(<TimesheetPeriodForm />);

    await user.type(screen.getByLabelText('Start date'), '2026-03-01');
    await user.type(screen.getByLabelText('End date'), '2026-05-15');
    await user.click(screen.getByRole('button', { name: /create period/i }));

    expect(await screen.findByText('Timesheet period created.')).toBeInTheDocument();
    expect(timesheetsApi.createTimesheetPeriod).toHaveBeenCalledWith({
      periodStart: '2026-03-01',
      periodEnd: '2026-05-15',
    });
  });

  it('shows an end-before-start validation error without submitting', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TimesheetPeriodForm />);

    await user.type(screen.getByLabelText('Start date'), '2026-05-15');
    await user.type(screen.getByLabelText('End date'), '2026-03-01');
    await user.click(screen.getByRole('button', { name: /create period/i }));

    expect(await screen.findByText('End date must be on or after the start date.')).toBeInTheDocument();
    expect(timesheetsApi.createTimesheetPeriod).not.toHaveBeenCalled();
  });

  it('surfaces the backend error message (e.g. an overlapping period) instead of a success message', async () => {
    timesheetsApi.createTimesheetPeriod.mockRejectedValue(new Error('This period overlaps an existing period.'));
    const user = userEvent.setup();
    renderWithProviders(<TimesheetPeriodForm />);

    await user.type(screen.getByLabelText('Start date'), '2026-03-01');
    await user.type(screen.getByLabelText('End date'), '2026-05-15');
    await user.click(screen.getByRole('button', { name: /create period/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Timesheet period created.')).not.toBeInTheDocument();
  });
});
