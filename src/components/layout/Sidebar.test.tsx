import { render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';

let mockPathname = '/timesheets';
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

const mockUseAuth = jest.fn();
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ role: 'SystemAdmin' });
  });

  it('highlights "My Timesheets" (not "Timesheet History") on /timesheets', () => {
    mockPathname = '/timesheets';
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'My Timesheets' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Timesheet History' })).not.toHaveAttribute('aria-current');
  });

  it('highlights "Timesheet History" (not "My Timesheets") on /timesheets/history', () => {
    mockPathname = '/timesheets/history';
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Timesheet History' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'My Timesheets' })).not.toHaveAttribute('aria-current');
  });

  it('hides Administration items from a non-SystemAdmin role', () => {
    mockPathname = '/dashboard';
    mockUseAuth.mockReturnValue({ role: 'User' });
    render(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'Create User' })).not.toBeInTheDocument();
  });
});
