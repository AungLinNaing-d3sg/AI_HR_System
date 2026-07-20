import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { TimesheetHistoryTable } from './TimesheetHistoryTable';
import type { TimesheetHistoryEntry } from '@/types/domain.types';

jest.mock('../../lib/api/timesheets.api', () => ({
  getTimesheetHistory: jest.fn(),
  approveTimesheetEntry: jest.fn(),
  deleteTimesheetEntry: jest.fn(),
}));

const timesheetsApi = jest.requireMock('../../lib/api/timesheets.api') as {
  getTimesheetHistory: jest.Mock;
  approveTimesheetEntry: jest.Mock;
  deleteTimesheetEntry: jest.Mock;
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
    timesheetsApi.deleteTimesheetEntry.mockReset();
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

  it('shows neither Delete nor an approve/edit action for a pending entry belonging to someone else when the viewer cannot approve', async () => {
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'someone-else' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(entries);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('does not show a Delete action for an already-approved entry', async () => {
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'user-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(entries);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    // Only entry-1 (pending, own) should have a Delete action; entry-2 is approved/Locked.
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1);
  });

  it("deletes the signed-in user's own pending entry after confirming in the dialog", async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'user-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(entries);
    timesheetsApi.deleteTimesheetEntry.mockResolvedValue(undefined);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(timesheetsApi.deleteTimesheetEntry).toHaveBeenCalledWith('entry-1'));
  });

  it('shows a Delete action alongside Approve for a ProjectAdmin reviewing someone else\'s pending entry', async () => {
    mockUseAuth.mockReturnValue({ role: 'ProjectAdmin', user: { id: 'admin-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(entries);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Lin Thit Htoo');
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('surfaces an error message when deleting an entry fails', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'user-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(entries);
    timesheetsApi.deleteTimesheetEntry.mockRejectedValue(new Error('Approved timesheet entries cannot be deleted.'));
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    expect(await screen.findByText('Could not delete this timesheet entry.')).toBeInTheDocument();
  });

  it('rejects a "From" date that is after the "To" date without applying the filter', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'user-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(entries);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    const [fromInput, toInput] = screen.getAllByDisplayValue('') as HTMLInputElement[];
    await user.type(fromInput, '2025-03-31');
    await user.type(toInput, '2025-03-01');
    await user.click(screen.getByRole('button', { name: /^filter$/i }));

    expect(await screen.findByText('"From" date must be on or before the "To" date.')).toBeInTheDocument();
    // Both entries (03-01 and 03-02) are still shown, i.e. the invalid filter was never applied
    // (2 table rows + 1 "Project Helix" <option> in the project filter dropdown).
    expect(screen.getAllByText('Project Helix')).toHaveLength(3);
    expect(screen.getAllByRole('row')).toHaveLength(3); // 1 header row + 2 entry rows
  });
});
