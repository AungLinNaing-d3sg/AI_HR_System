import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { TimesheetHistoryTable } from './TimesheetHistoryTable';
import type { TimesheetHistoryEntry } from '@/types/domain.types';

jest.mock('../../lib/api/timesheets.api', () => ({
  getTimesheetHistory: jest.fn(),
  approveTimesheetEntry: jest.fn(),
}));

const timesheetsApi = jest.requireMock('../../lib/api/timesheets.api') as {
  getTimesheetHistory: jest.Mock;
  approveTimesheetEntry: jest.Mock;
};

const mockUseAuth = jest.fn();
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const entries: TimesheetHistoryEntry[] = [
  {
    id: 'entry-1',
    userId: 'user-1',
    userName: 'Lin Thit Htoo',
    projectId: 'project-1',
    projectCode: 'PRJ-001',
    projectName: 'Project Helix',
    entryDate: '2025-03-01',
    hours: 8,
    taskDescription: 'Worked on feature implementation',
    isApproved: false,
    approvedAt: null,
  },
  {
    id: 'entry-2',
    userId: 'user-1',
    userName: 'Lin Thit Htoo',
    projectId: 'project-1',
    projectCode: 'PRJ-001',
    projectName: 'Project Helix',
    entryDate: '2025-03-02',
    hours: 6,
    taskDescription: null,
    isApproved: true,
    approvedAt: '2026-06-22T05:18:00',
  },
];

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('TimesheetHistoryTable', () => {
  beforeEach(() => {
    timesheetsApi.getTimesheetHistory.mockReset();
    timesheetsApi.approveTimesheetEntry.mockReset();
    mockUseAuth.mockReturnValue({ role: 'User' });
  });

  it('shows a loading state initially', () => {
    timesheetsApi.getTimesheetHistory.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<TimesheetHistoryTable />);
    expect(screen.getByText(/loading timesheet history/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no entries', async () => {
    timesheetsApi.getTimesheetHistory.mockResolvedValue([]);
    renderWithProviders(<TimesheetHistoryTable />);
    expect(await screen.findByText(/no timesheet entries yet/i)).toBeInTheDocument();
  });

  it('shows an error state with a retry action when the list fails to load', async () => {
    timesheetsApi.getTimesheetHistory.mockRejectedValue(new Error('network down'));
    renderWithProviders(<TimesheetHistoryTable />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders Approved/Pending badges per entry', async () => {
    timesheetsApi.getTimesheetHistory.mockResolvedValue(entries);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('hides the User column and Approve action for a plain User', async () => {
    mockUseAuth.mockReturnValue({ role: 'User' });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(entries);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    expect(screen.queryByText('Lin Thit Htoo')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('shows the Approve action for a pending entry to a ProjectAdmin and calls approveTimesheetEntry', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ role: 'ProjectAdmin' });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(entries);
    timesheetsApi.approveTimesheetEntry.mockResolvedValue({
      id: 'entry-1',
      isApproved: true,
      approvedAt: '2026-07-18T00:00:00.000Z',
    });
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Lin Thit Htoo');
    const approveButtons = screen.getAllByRole('button', { name: 'Approve' });
    expect(approveButtons).toHaveLength(1);

    await user.click(approveButtons[0]);
    await waitFor(() => expect(timesheetsApi.approveTimesheetEntry).toHaveBeenCalledWith('entry-1'));
  });

  it('shows "Locked" (no action) for an already-approved entry, regardless of who is viewing', async () => {
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'user-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(entries);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    expect(screen.getByText('Locked')).toBeInTheDocument();
  });

  it('shows an "Edit" link to the timesheet grid for the signed-in user\'s own pending entry', async () => {
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'user-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(entries);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    const editLink = screen.getByRole('link', { name: 'Edit' });
    // 2025-03-01 is a Saturday - its Monday is 2025-02-24.
    expect(editLink).toHaveAttribute('href', '/timesheets?week=2025-02-24');
  });

  it('shows neither Edit nor Approve for a pending entry that belongs to someone else and the viewer cannot approve', async () => {
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'someone-else' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(entries);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });
});
