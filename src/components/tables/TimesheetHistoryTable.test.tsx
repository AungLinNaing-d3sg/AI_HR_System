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
    resourceRoleTypeName: 'Senior Developer',
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
    resourceRoleTypeName: 'Senior Developer',
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

// `getTimesheetHistory` now resolves the paginated envelope (see
// `TimesheetHistoryResult` in lib/api/timesheets.api.ts) rather than a bare
// entry array - `historyResult` is the shared "one page, everything fits"
// shape most tests below reuse.
const historyResult = { entries, totalCount: entries.length, pageNo: 1, pageSize: 20 };

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
    timesheetsApi.getTimesheetHistory.mockResolvedValue({ entries: [], totalCount: 0, pageNo: 1, pageSize: 20 });
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
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('shows the project code as secondary text beneath the project name', async () => {
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    const [projectCode] = screen.getAllByText('PRJ-001');
    expect(projectCode).toBeInTheDocument();
    expect(projectCode).toHaveClass('text-xs', 'text-zinc-500');
  });

  it('shows the resource role type as secondary text beneath the user name for a role that can see the User column', async () => {
    mockUseAuth.mockReturnValue({ role: 'ProjectAdmin', user: { id: 'user-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Lin Thit Htoo');
    const [roleName] = screen.getAllByText('Senior Developer');
    expect(roleName).toBeInTheDocument();
    expect(roleName).toHaveClass('text-xs', 'text-zinc-500');
  });

  it('renders a leading edit icon and right-aligns the row actions, with Edit matching the bordered Approve/Delete buttons', async () => {
    mockUseAuth.mockReturnValue({ role: 'ProjectAdmin', user: { id: 'user-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Lin Thit Htoo');

    const [editLink] = screen.getAllByRole('link', { name: 'Edit' });
    expect(editLink.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
    // Same box height/border/corner-radius as the adjacent `size="sm"` `outline` buttons,
    // so the link renders as a visually-identical control.
    expect(editLink).toHaveClass('h-8', 'border', 'rounded-md');

    const actionsContainer = editLink.parentElement;
    expect(actionsContainer).toHaveClass('justify-end');
    // A tight gap between actions keeps the actions column as narrow as possible.
    expect(actionsContainer).toHaveClass('gap-1.5');

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    expect(deleteButton).toHaveClass('h-8', 'border-red-200');
  });

  it('renders the three stat cards with their hour totals', async () => {
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    expect(screen.getByText('Total hours logged')).toBeInTheDocument();
    expect(screen.getByText('14h')).toBeInTheDocument(); // 8 + 6
    expect(screen.getByText('Approved hours')).toBeInTheDocument();
    expect(screen.getByText('6h')).toBeInTheDocument();
    expect(screen.getByText('Pending approval')).toBeInTheDocument();
    expect(screen.getByText('8h')).toBeInTheDocument();
  });

  it('hides the User column and Approve action for a plain User', async () => {
    mockUseAuth.mockReturnValue({ role: 'User' });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    expect(screen.queryByText('Lin Thit Htoo')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('shows the Approve action for a pending entry to a ProjectAdmin and calls approveTimesheetEntry', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ role: 'ProjectAdmin' });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    timesheetsApi.approveTimesheetEntry.mockResolvedValue({
      id: 'entry-1',
      isApproved: true,
      approvedAt: '2026-07-18T00:00:00.000Z',
    });
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Lin Thit Htoo');
    const approveButtons = screen.getAllByRole('button', { name: 'Approve' });
    expect(approveButtons).toHaveLength(1);
    // Same bordered `h-8` box as the Edit/Delete actions, only tinted green for this action.
    expect(approveButtons[0]).toHaveClass('h-8', 'border-green-200');

    await user.click(approveButtons[0]);
    await waitFor(() => expect(timesheetsApi.approveTimesheetEntry).toHaveBeenCalledWith('entry-1'));
  });

  it('shows "Locked" (no action) for an already-approved entry that is not the viewer\'s own and needs no review', async () => {
    mockUseAuth.mockReturnValue({ role: 'ProjectAdmin', user: { id: 'admin-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Lin Thit Htoo');
    const lockedLabel = screen.getByText('Locked');
    expect(lockedLabel).toBeInTheDocument();
    // "Locked" is paired with a decorative lock icon (`aria-hidden`), not read out twice by assistive tech.
    expect(lockedLabel.parentElement?.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
  });

  it("shows an Edit link (not Locked) for the signed-in user's own already-approved entry, since editing resets it to Pending Approval", async () => {
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'user-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    expect(screen.queryByText('Locked')).not.toBeInTheDocument();
    const editLinks = screen.getAllByRole('link', { name: 'Edit' });
    expect(editLinks).toHaveLength(2);
    expect(editLinks[1]).toHaveAttribute('title', 'Editing this entry resets it to Pending Approval for re-review.');
  });

  it('shows an "Edit" link to the timesheet grid for the signed-in user\'s own pending entry', async () => {
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'user-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    // Both entries belong to user-1, so both are editable; the first (entry-1, pending) is asserted here.
    const [editLink] = screen.getAllByRole('link', { name: 'Edit' });
    // 2025-03-01 is a Saturday - its Monday is 2025-02-24.
    expect(editLink).toHaveAttribute('href', '/timesheets?week=2025-02-24');
  });

  it('shows neither Edit nor Approve for a pending entry that belongs to someone else and the viewer cannot approve', async () => {
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'someone-else' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('shows neither Delete nor an approve/edit action for a pending entry belonging to someone else when the viewer cannot approve', async () => {
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'someone-else' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('does not show a Delete action for an already-approved entry', async () => {
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'user-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    // Only entry-1 (pending, own) should have a Delete action; entry-2 is approved/Locked.
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1);
  });

  it("deletes the signed-in user's own pending entry after confirming in the dialog", async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'user-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
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
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Lin Thit Htoo');
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('surfaces an error message when deleting an entry fails', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'user-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
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
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
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

  it('renders the filter section as a single inline filter bar (Date From/To, Project, Filter/Reset)', async () => {
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'user-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    const form = screen.getByRole('form', { name: /filter timesheet history/i });
    expect(within(form).getByLabelText('From')).toBeInTheDocument();
    expect(within(form).getByLabelText('To')).toBeInTheDocument();
    expect(within(form).getByLabelText('Project')).toBeInTheDocument();
    expect(within(form).getByRole('button', { name: /^filter$/i })).toBeInTheDocument();
    expect(within(form).getByRole('button', { name: /^reset$/i })).toBeInTheDocument();
  });

  it('applies a date-range filter to only show matching entries', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'user-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    await user.type(screen.getByLabelText('From'), '2025-03-02');
    await user.type(screen.getByLabelText('To'), '2025-03-02');
    await user.click(screen.getByRole('button', { name: /^filter$/i }));

    // Only the 03-02 (6h, approved) entry should remain.
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2)); // 1 header row + 1 matching entry row
    expect(screen.queryByText('Locked')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Edit' })).toHaveLength(1);
  });

  it('clears an applied filter and restores every entry when Reset is clicked', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'user-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    await user.type(screen.getByLabelText('From'), '2025-03-02');
    await user.type(screen.getByLabelText('To'), '2025-03-02');
    await user.click(screen.getByRole('button', { name: /^filter$/i }));
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2));

    await user.click(screen.getByRole('button', { name: /^reset$/i }));

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('');
  });

  it('does not render pagination controls when every entry fits on one page', async () => {
    mockUseAuth.mockReturnValue({ role: 'User', user: { id: 'user-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue(historyResult);
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
  });

  it('renders the shared Pagination control and requests the next page on click', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ role: 'SystemAdmin', user: { id: 'admin-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue({ entries, totalCount: 45, pageNo: 1, pageSize: 20 });
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    const pagination = screen.getByRole('navigation', { name: /pagination/i });
    expect(within(pagination).getByText(/showing/i)).toBeInTheDocument();

    await user.click(within(pagination).getByRole('button', { name: /next/i }));

    await waitFor(() =>
      expect(timesheetsApi.getTimesheetHistory).toHaveBeenLastCalledWith({ pageNo: 2, pageSize: 20 })
    );
  });

  it(
    'keeps the previous page\'s stat cards/filter bar/table mounted (only showing an inline ' +
      '"Updating…" note) while the next page loads, instead of collapsing to the bare loading state',
    async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ role: 'SystemAdmin', user: { id: 'admin-1' } });

      let resolveSecondPage: (value: typeof historyResult) => void = () => {};
      timesheetsApi.getTimesheetHistory
        .mockResolvedValueOnce({ entries, totalCount: 45, pageNo: 1, pageSize: 20 })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveSecondPage = resolve;
            })
        );
      renderWithProviders(<TimesheetHistoryTable />);

      await screen.findAllByText('Project Helix');
      const pagination = screen.getByRole('navigation', { name: /pagination/i });
      await user.click(within(pagination).getByRole('button', { name: /next/i }));

      // Page 2 is still in flight: page 1's stat cards, filter bar, and rows
      // all stay on screen (this is the fix for the "scrolls down into blank
      // space" bug - the whole layout no longer unmounts down to a bare
      // "Loading timesheet history…" line on every page turn).
      expect(screen.getByText('Total hours logged')).toBeInTheDocument();
      expect(screen.getByRole('form', { name: /filter timesheet history/i })).toBeInTheDocument();
      expect(screen.getAllByText('Project Helix').length).toBeGreaterThan(0);
      expect(screen.queryByText(/^loading timesheet history/i)).not.toBeInTheDocument();
      expect(screen.getByText(/updating/i)).toBeInTheDocument();
      // Previous/Next disable while the next page is being fetched, matching
      // the shared `Pagination` control's own documented `isLoading` intent.
      expect(within(pagination).getByRole('button', { name: /next/i })).toBeDisabled();

      resolveSecondPage({ entries, totalCount: 45, pageNo: 2, pageSize: 20 });
      await waitFor(() => expect(screen.queryByText(/updating/i)).not.toBeInTheDocument());
      expect(within(pagination).getByRole('button', { name: /next/i })).not.toBeDisabled();
    }
  );

  it('jumps back to page 1 when a filter is applied', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ role: 'SystemAdmin', user: { id: 'admin-1' } });
    timesheetsApi.getTimesheetHistory.mockResolvedValue({ entries, totalCount: 45, pageNo: 1, pageSize: 20 });
    renderWithProviders(<TimesheetHistoryTable />);

    await screen.findAllByText('Project Helix');
    const pagination = screen.getByRole('navigation', { name: /pagination/i });
    await user.click(within(pagination).getByRole('button', { name: /next/i }));
    await waitFor(() =>
      expect(timesheetsApi.getTimesheetHistory).toHaveBeenLastCalledWith({ pageNo: 2, pageSize: 20 })
    );

    await user.click(screen.getByRole('button', { name: /^reset$/i }));

    await waitFor(() =>
      expect(timesheetsApi.getTimesheetHistory).toHaveBeenLastCalledWith({ pageNo: 1, pageSize: 20 })
    );
  });
});
