import { render, screen } from '@testing-library/react';
import { DashboardOverview } from './DashboardOverview';
import type { UserRole } from '@/types/domain.types';

jest.mock('../../hooks/useProjects', () => ({
  useProjects: jest.fn(),
}));
jest.mock('../../hooks/useTimesheetWeek', () => ({
  useTimesheetWeek: jest.fn(),
}));
jest.mock('../../hooks/useTimesheetHistory', () => ({
  useTimesheetHistory: jest.fn(),
}));

const { useProjects } = jest.requireMock('../../hooks/useProjects') as { useProjects: jest.Mock };
const { useTimesheetWeek } = jest.requireMock('../../hooks/useTimesheetWeek') as { useTimesheetWeek: jest.Mock };
const { useTimesheetHistory } = jest.requireMock('../../hooks/useTimesheetHistory') as {
  useTimesheetHistory: jest.Mock;
};

function setupHooks(overrides?: { entries?: Array<Record<string, unknown>> }) {
  useProjects.mockReturnValue({ projects: [], isLoading: false });
  useTimesheetWeek.mockReturnValue({ week: { entries: [] }, isLoading: false });
  useTimesheetHistory.mockReturnValue({ entries: overrides?.entries ?? [], isLoading: false });
}

describe('DashboardOverview', () => {
  beforeEach(() => {
    useProjects.mockReset();
    useTimesheetWeek.mockReset();
    useTimesheetHistory.mockReset();
    setupHooks();
  });

  it('shows loading placeholders for each stat card while data is loading', () => {
    useProjects.mockReturnValue({ projects: [], isLoading: true });
    useTimesheetWeek.mockReturnValue({ week: null, isLoading: true });
    useTimesheetHistory.mockReturnValue({ entries: [], isLoading: true });

    render(<DashboardOverview role="User" />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('shows an empty state when there are no recent timesheet entries', () => {
    render(<DashboardOverview role="User" />);
    expect(screen.getByText('No timesheet entries yet.')).toBeInTheDocument();
  });

  it('renders recent timesheet entries sorted by most recent date first', () => {
    setupHooks({
      entries: [
        {
          id: 'entry-1',
          projectName: 'Project Alpha',
          entryDate: '2026-06-01',
          hours: 4,
          isApproved: true,
        },
        {
          id: 'entry-2',
          projectName: 'Project Beta',
          entryDate: '2026-06-10',
          hours: 2,
          isApproved: false,
        },
      ],
    });

    render(<DashboardOverview role="User" />);

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Project Beta');
    expect(items[1]).toHaveTextContent('Project Alpha');
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('hides the "View Reports" quick action for a plain User', () => {
    render(<DashboardOverview role="User" />);
    expect(screen.queryByRole('link', { name: /view reports/i })).not.toBeInTheDocument();
  });

  it.each<UserRole>(['SystemAdmin', 'ProjectAdmin'])(
    'shows the "View Reports" quick action linking to /reports for %s',
    (role) => {
      render(<DashboardOverview role={role} />);
      const reportsLink = screen.getByRole('link', { name: /view reports/i });
      expect(reportsLink).toHaveAttribute('href', '/reports');
    }
  );

  it('shows the "Create User" quick action only for SystemAdmin', () => {
    const { rerender } = render(<DashboardOverview role="SystemAdmin" />);
    expect(screen.getByRole('link', { name: /create user/i })).toBeInTheDocument();

    rerender(<DashboardOverview role="ProjectAdmin" />);
    expect(screen.queryByRole('link', { name: /create user/i })).not.toBeInTheDocument();
  });

  it('hides role-gated quick actions when role is null', () => {
    render(<DashboardOverview role={null} />);
    expect(screen.queryByRole('link', { name: /view reports/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /create user/i })).not.toBeInTheDocument();
  });
});
