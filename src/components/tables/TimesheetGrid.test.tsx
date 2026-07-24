import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimesheetGrid } from './TimesheetGrid';
import type { TimesheetGridRowView } from '@/hooks/useTimesheetGrid';

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Pin "today" to a fixed date within the mocked week so entry-restriction
// behavior (only today's column is editable) is deterministic regardless of
// when the test suite actually runs.
const TODAY = '2025-02-27';
jest.mock('../../lib/utils/week', () => ({
  ...jest.requireActual('../../lib/utils/week'),
  getLocalDateString: () => TODAY,
}));

jest.mock('../../hooks/useTimesheetGrid', () => ({
  useTimesheetGrid: jest.fn(),
}));

jest.mock('../../hooks/useTimesheetPeriods', () => ({
  useTimesheetPeriods: jest.fn(),
}));

const { useSearchParams } = jest.requireMock('next/navigation') as { useSearchParams: jest.Mock };
const { useTimesheetGrid } = jest.requireMock('../../hooks/useTimesheetGrid') as {
  useTimesheetGrid: jest.Mock;
};
const { useTimesheetPeriods } = jest.requireMock('../../hooks/useTimesheetPeriods') as {
  useTimesheetPeriods: jest.Mock;
};

const weekDates = ['2025-02-24', '2025-02-25', '2025-02-26', '2025-02-27', '2025-02-28', '2025-03-01', '2025-03-02'];

function makeRow(overrides: Partial<TimesheetGridRowView> = {}): TimesheetGridRowView {
  return {
    projectId: 'project-1',
    projectCode: 'PRJ-ALPHA',
    projectName: 'Project Alpha - Web Platform',
    clientName: 'Acme Corp',
    maxDailyHours: null,
    totalHours: 21,
    cells: weekDates.map((date, index) => ({
      date,
      entryId: index < 3 ? `entry-${index}` : null,
      hours: index < 3 ? 6 + index : 0,
      taskDescription: index === 0 ? 'Frontend component development' : '',
      isApproved: false,
      hoursInput: index < 3 ? String(6 + index) : '',
      error: null,
      isDirty: false,
    })),
    ...overrides,
  };
}

function baseHookValue(overrides: Record<string, unknown> = {}) {
  return {
    weekStart: '2025-02-24',
    weekEnd: '2025-03-02',
    weekDates,
    rows: [makeRow()],
    dailyTotals: [6, 7, 8, 0, 0, 0, 0],
    dailyHoursWarningThreshold: 8,
    period: { id: 'period-1', periodStart: '2025-02-01', periodEnd: '2025-02-28', isLocked: false },
    isLocked: false,
    hasPeriod: true,
    canEdit: true,
    isLoading: false,
    isError: false,
    error: null,
    isDirty: false,
    hasValidationErrors: false,
    isSaving: false,
    saveError: null,
    setCell: jest.fn(),
    saveAll: jest.fn().mockResolvedValue(undefined),
    goToPreviousWeek: jest.fn(),
    goToNextWeek: jest.fn(),
    goToCurrentWeek: jest.fn(),
    goToPeriod: jest.fn(),
    refetch: jest.fn(),
    ...overrides,
  };
}

const periodsList = [
  { id: 'period-1', periodStart: '2025-02-01', periodEnd: '2025-02-28', isLocked: false },
  { id: 'period-2', periodStart: '2025-03-01', periodEnd: '2025-03-31', isLocked: true },
];

function basePeriodsHookValue(overrides: Record<string, unknown> = {}) {
  return {
    periods: periodsList,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  };
}

describe('TimesheetGrid', () => {
  beforeEach(() => {
    useTimesheetGrid.mockReset();
    useTimesheetPeriods.mockReset();
    useTimesheetPeriods.mockReturnValue(basePeriodsHookValue());
    useSearchParams.mockReturnValue(new URLSearchParams());
  });

  it('shows a loading state', () => {
    useTimesheetGrid.mockReturnValue(baseHookValue({ isLoading: true }));
    render(<TimesheetGrid />);
    expect(screen.getByText(/loading timesheet/i)).toBeInTheDocument();
  });

  it('shows an error state with a retry action', () => {
    const refetch = jest.fn();
    useTimesheetGrid.mockReturnValue(baseHookValue({ isError: true, error: 'network down', refetch }));
    render(<TimesheetGrid />);

    expect(screen.getByRole('alert')).toHaveTextContent('network down');
    screen.getByRole('button', { name: /try again/i }).click();
    expect(refetch).toHaveBeenCalled();
  });

  it('renders the week range, day headers, project row, and daily totals', () => {
    useTimesheetGrid.mockReturnValue(baseHookValue());
    render(<TimesheetGrid />);

    expect(screen.getByText('Feb 24 – Mar 2, 2025')).toBeInTheDocument();
    expect(screen.getByText('Project Alpha - Web Platform')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Daily Total')).toBeInTheDocument();
    expect(screen.getByLabelText('Mon, Feb 24 hours for Project Alpha - Web Platform')).toHaveValue(6);
  });

  it('shows an alert when no timesheet period covers the week and disables Save All', () => {
    useTimesheetGrid.mockReturnValue(baseHookValue({ hasPeriod: false, period: null, canEdit: false }));
    render(<TimesheetGrid />);

    expect(screen.getByText(/no timesheet period has been set up/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save all/i })).toBeDisabled();
  });

  it('shows an alert when the period is locked', () => {
    useTimesheetGrid.mockReturnValue(baseHookValue({ isLocked: true, canEdit: false }));
    render(<TimesheetGrid />);
    expect(screen.getByText(/locked and can no longer be edited/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no active projects', () => {
    useTimesheetGrid.mockReturnValue(baseHookValue({ rows: [] }));
    render(<TimesheetGrid />);
    expect(screen.getByText(/no active projects are available/i)).toBeInTheDocument();
  });

  it('calls goToPreviousWeek/goToNextWeek/goToCurrentWeek from the navigator buttons', async () => {
    const user = userEvent.setup();
    const goToPreviousWeek = jest.fn();
    const goToNextWeek = jest.fn();
    const goToCurrentWeek = jest.fn();
    useTimesheetGrid.mockReturnValue(baseHookValue({ goToPreviousWeek, goToNextWeek, goToCurrentWeek }));
    render(<TimesheetGrid />);

    await user.click(screen.getByRole('button', { name: /previous week/i }));
    await user.click(screen.getByRole('button', { name: /next week/i }));
    await user.click(screen.getByRole('button', { name: /this week/i }));

    expect(goToPreviousWeek).toHaveBeenCalled();
    expect(goToNextWeek).toHaveBeenCalled();
    expect(goToCurrentWeek).toHaveBeenCalled();
  });

  it('calls saveAll when Save All is clicked while dirty and valid', async () => {
    const user = userEvent.setup();
    const saveAll = jest.fn().mockResolvedValue(undefined);
    useTimesheetGrid.mockReturnValue(baseHookValue({ isDirty: true, saveAll }));
    render(<TimesheetGrid />);

    await user.click(screen.getByRole('button', { name: /save all/i }));
    expect(saveAll).toHaveBeenCalled();
  });

  it('expands a row to show task notes when the info toggle is clicked', async () => {
    const user = userEvent.setup();
    useTimesheetGrid.mockReturnValue(baseHookValue());
    render(<TimesheetGrid />);

    const toggle = screen.getByRole('button', { name: /show task notes for project alpha/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByLabelText('Task notes for Project Alpha - Web Platform on Mon, Feb 24')
    ).toBeInTheDocument();
  });

  it('calls setCell when an hours input changes', async () => {
    const user = userEvent.setup();
    const setCell = jest.fn();
    useTimesheetGrid.mockReturnValue(baseHookValue({ setCell }));
    render(<TimesheetGrid />);

    const thursdayInput = screen.getByLabelText('Thu, Feb 27 hours for Project Alpha - Web Platform');
    await user.type(thursdayInput, '5');

    expect(setCell).toHaveBeenCalledWith('project-1', '2025-02-27', { hoursInput: expect.any(String) });
  });

  it('flags a day whose total exceeds the warning threshold', () => {
    useTimesheetGrid.mockReturnValue(baseHookValue({ dailyTotals: [6, 7, 9, 0, 0, 0, 0] }));
    render(<TimesheetGrid />);

    expect(screen.getByLabelText('Daily total exceeds 8 hours')).toBeInTheDocument();
  });

  it('resolves a ?week= search param (from the History "Edit" link) to that week\'s Monday', () => {
    useSearchParams.mockReturnValue(new URLSearchParams('week=2025-02-25'));
    useTimesheetGrid.mockReturnValue(baseHookValue());
    render(<TimesheetGrid />);

    expect(useTimesheetGrid).toHaveBeenCalledWith('2025-02-24');
  });

  it('ignores an invalid ?week= value and falls back to the default (current) week', () => {
    useSearchParams.mockReturnValue(new URLSearchParams('week=not-a-date'));
    useTimesheetGrid.mockReturnValue(baseHookValue());
    render(<TimesheetGrid />);

    expect(useTimesheetGrid).toHaveBeenCalledWith(undefined);
  });

  it('renders the Timesheet Period dropdown, pre-selected to the week\'s current period', () => {
    useTimesheetGrid.mockReturnValue(baseHookValue());
    render(<TimesheetGrid />);

    const select = screen.getByLabelText('Timesheet Period') as HTMLSelectElement;
    expect(select).toHaveValue('period-1');
    expect(screen.getByText('Feb 1, 2025 – Feb 28, 2025')).toBeInTheDocument();
    expect(screen.getByText('Mar 1, 2025 – Mar 31, 2025 (Locked)')).toBeInTheDocument();
  });

  it('calls goToPeriod with the selected period when the Timesheet Period dropdown changes', async () => {
    const user = userEvent.setup();
    const goToPeriod = jest.fn();
    useTimesheetGrid.mockReturnValue(baseHookValue({ goToPeriod }));
    render(<TimesheetGrid />);

    await user.selectOptions(screen.getByLabelText('Timesheet Period'), 'period-2');

    expect(goToPeriod).toHaveBeenCalledWith(periodsList[1]);
  });

  it('shows a loading placeholder and disables the dropdown while periods are loading', () => {
    useTimesheetGrid.mockReturnValue(baseHookValue());
    useTimesheetPeriods.mockReturnValue(basePeriodsHookValue({ periods: [], isLoading: true }));
    render(<TimesheetGrid />);

    expect(screen.getByText('Loading periods…')).toBeInTheDocument();
    expect(screen.getByLabelText('Timesheet Period')).toBeDisabled();
  });

  it('shows an error with a retry action when timesheet periods fail to load', async () => {
    const user = userEvent.setup();
    const refetch = jest.fn();
    useTimesheetGrid.mockReturnValue(baseHookValue());
    useTimesheetPeriods.mockReturnValue(
      basePeriodsHookValue({ periods: [], isError: true, error: 'periods down', refetch })
    );
    render(<TimesheetGrid />);

    expect(screen.getByText('periods down')).toBeInTheDocument();
    expect(screen.getByLabelText('Timesheet Period')).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows an empty-state message and disables the dropdown when no timesheet periods exist', () => {
    useTimesheetGrid.mockReturnValue(baseHookValue({ period: null, hasPeriod: false, canEdit: false }));
    useTimesheetPeriods.mockReturnValue(basePeriodsHookValue({ periods: [] }));
    render(<TimesheetGrid />);

    expect(screen.getByText(/no timesheet periods have been created yet/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Timesheet Period')).toBeDisabled();
  });

  it('only allows entry for today - all other day columns are disabled', () => {
    useTimesheetGrid.mockReturnValue(baseHookValue());
    render(<TimesheetGrid />);

    // Today (mocked to 2025-02-27, Thursday) stays enabled...
    expect(screen.getByLabelText('Thu, Feb 27 hours for Project Alpha - Web Platform')).toBeEnabled();
    // ...every other day of the week is rendered read-only.
    expect(screen.getByLabelText(/Mon, Feb 24 hours for Project Alpha - Web Platform/)).toBeDisabled();
    expect(screen.getByLabelText(/Tue, Feb 25 hours for Project Alpha - Web Platform/)).toBeDisabled();
    expect(screen.getByLabelText(/Wed, Feb 26 hours for Project Alpha - Web Platform/)).toBeDisabled();
    expect(screen.getByLabelText(/Fri, Feb 28 hours for Project Alpha - Web Platform/)).toBeDisabled();
  });

  it("flags today's column header and shows an info banner explaining the entry restriction", () => {
    useTimesheetGrid.mockReturnValue(baseHookValue());
    render(<TimesheetGrid />);

    expect(screen.getByText('Today')).toBeInTheDocument();
    const banner = screen.getByText(/you can only log hours and notes for today/i);
    expect(banner.closest('[role="alert"]')).toBeInTheDocument();
  });

  it('does not forward a setCell call for a disabled, non-today day even if triggered programmatically', async () => {
    const setCell = jest.fn();
    useTimesheetGrid.mockReturnValue(baseHookValue({ setCell }));
    render(<TimesheetGrid />);

    const mondayInput = screen.getByLabelText(/Mon, Feb 24 hours for Project Alpha - Web Platform/);
    expect(mondayInput).toBeDisabled();

    // A disabled input never fires a change event via user interaction; this
    // asserts the defense-in-depth guard in `TimesheetGrid` itself rejects a
    // non-today date even if it were ever invoked.
    fireEvent.change(mondayInput, { target: { value: '5' } });
    expect(setCell).not.toHaveBeenCalled();
  });

  it('disables the task notes textarea for non-today days but keeps it enabled for today', async () => {
    const user = userEvent.setup();
    useTimesheetGrid.mockReturnValue(baseHookValue());
    render(<TimesheetGrid />);

    await user.click(screen.getByRole('button', { name: /show task notes for project alpha/i }));

    expect(screen.getByLabelText(/Task notes for Project Alpha - Web Platform on Thu, Feb 27/)).toBeEnabled();
    expect(screen.getByLabelText(/Task notes for Project Alpha - Web Platform on Mon, Feb 24/)).toBeDisabled();
  });
});
