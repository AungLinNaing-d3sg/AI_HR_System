import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardOverview } from './DashboardOverview';
import type { UserRole } from '@/types/domain.types';

jest.mock('../../hooks/useProjects', () => ({
  useProjects: jest.fn(),
}));
jest.mock('../../hooks/useMyProjects', () => ({
  useMyProjects: jest.fn(),
}));
jest.mock('../../hooks/useTimesheetWeek', () => ({
  useTimesheetWeek: jest.fn(),
}));
jest.mock('../../hooks/useTimesheetHistory', () => ({
  useTimesheetHistory: jest.fn(),
}));

const { useProjects } = jest.requireMock('../../hooks/useProjects') as { useProjects: jest.Mock };
const { useMyProjects } = jest.requireMock('../../hooks/useMyProjects') as { useMyProjects: jest.Mock };
const { useTimesheetWeek } = jest.requireMock('../../hooks/useTimesheetWeek') as { useTimesheetWeek: jest.Mock };
const { useTimesheetHistory } = jest.requireMock('../../hooks/useTimesheetHistory') as {
  useTimesheetHistory: jest.Mock;
};

function setupHooks(overrides?: { entries?: Array<Record<string, unknown>> }) {
  useProjects.mockReturnValue({ projects: [], isLoading: false, isError: false, error: null, refetch: jest.fn() });
  useMyProjects.mockReturnValue({ projects: [], isLoading: false, isError: false, error: null, refetch: jest.fn() });
  useTimesheetWeek.mockReturnValue({
    week: { entries: [] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  useTimesheetHistory.mockReturnValue({
    entries: overrides?.entries ?? [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
}

describe('DashboardOverview', () => {
  beforeEach(() => {
    useProjects.mockReset();
    useMyProjects.mockReset();
    useTimesheetWeek.mockReset();
    useTimesheetHistory.mockReset();
    setupHooks();
  });

  it('shows loading placeholders for each stat card while data is loading', () => {
    useProjects.mockReturnValue({ projects: [], isLoading: true, isError: false, error: null, refetch: jest.fn() });
    useTimesheetWeek.mockReturnValue({ week: null, isLoading: true, isError: false, error: null, refetch: jest.fn() });
    useTimesheetHistory.mockReturnValue({
      entries: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<DashboardOverview role="SystemAdmin" />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('shows an empty state when there are no recent timesheet entries', () => {
    render(<DashboardOverview role="User" />);
    expect(screen.getByText('No timesheet entries yet.')).toBeInTheDocument();
  });

  it('renders recent timesheet entries sorted by most recent date first, with their task description', () => {
    setupHooks({
      entries: [
        {
          id: 'entry-1',
          projectName: 'Project Alpha',
          entryDate: '2026-06-01',
          hours: 4,
          taskDescription: 'Frontend component development',
          isApproved: true,
        },
        {
          id: 'entry-2',
          projectName: 'Project Beta',
          entryDate: '2026-06-10',
          hours: 2,
          taskDescription: null,
          isApproved: false,
        },
      ],
    });

    render(<DashboardOverview role="User" />);

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Project Beta');
    expect(items[0]).toHaveTextContent('No task description provided.');
    expect(items[1]).toHaveTextContent('Project Alpha');
    expect(items[1]).toHaveTextContent('Frontend component development');
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('shows a dismissible-by-retry error banner when a data source fails, and refetches only the failed ones', async () => {
    const refetchProjects = jest.fn();
    const refetchWeek = jest.fn();
    useProjects.mockReturnValue({
      projects: [],
      isLoading: false,
      isError: true,
      error: 'Could not load projects.',
      refetch: refetchProjects,
    });
    useTimesheetWeek.mockReturnValue({
      week: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchWeek,
    });

    render(<DashboardOverview role="SystemAdmin" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load projects.');

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetchProjects).toHaveBeenCalledTimes(1);
    expect(refetchWeek).not.toHaveBeenCalled();
  });

  it('uses GetMyProjectList (useMyProjects) for the Total Projects stat card for a plain User (Employee)', () => {
    useMyProjects.mockReturnValue({
      projects: [{ id: 'p1' }, { id: 'p2' }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<DashboardOverview role="User" />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(useProjects).toHaveBeenCalledWith(false);
    expect(useMyProjects).toHaveBeenCalledWith(true);
  });

  it('uses GetProjectList (useProjects) for the Total Projects stat card for a SystemAdmin', () => {
    useProjects.mockReturnValue({
      projects: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<DashboardOverview role="SystemAdmin" />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(useMyProjects).toHaveBeenCalledWith(false);
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
