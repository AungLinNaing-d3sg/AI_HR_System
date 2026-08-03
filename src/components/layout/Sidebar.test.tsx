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
    mockUseAuth.mockReturnValue({ role: 'Employee' });
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'My Timesheets' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Timesheet History' })).not.toHaveAttribute('aria-current');
  });

  it('highlights "Timesheet History" (not "My Timesheets") on /timesheets/history', () => {
    mockPathname = '/timesheets/history';
    mockUseAuth.mockReturnValue({ role: 'Employee' });
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Timesheet History' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'My Timesheets' })).not.toHaveAttribute('aria-current');
  });

  it('hides "My Timesheets" from a SystemAdmin but keeps "Timesheet History" visible', () => {
    mockPathname = '/dashboard';
    mockUseAuth.mockReturnValue({ role: 'SystemAdmin' });
    render(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'My Timesheets' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Timesheet History' })).toBeInTheDocument();
  });

  it('shows "My Timesheets" to a ProjectAdmin', () => {
    mockPathname = '/dashboard';
    mockUseAuth.mockReturnValue({ role: 'ProjectAdmin' });
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'My Timesheets' })).toHaveAttribute('href', '/timesheets');
  });

  it('hides Administration items from a non-SystemAdmin role', () => {
    mockPathname = '/dashboard';
    mockUseAuth.mockReturnValue({ role: 'Employee' });
    render(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Currencies' })).not.toBeInTheDocument();
  });

  it('shows the Currencies link to a SystemAdmin and links it to /admin/currencies', () => {
    mockPathname = '/dashboard';
    mockUseAuth.mockReturnValue({ role: 'SystemAdmin' });
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Currencies' })).toHaveAttribute('href', '/admin/currencies');
  });

  it('shows the Exchange Rates link to a SystemAdmin and links it to /admin/exchange-rates', () => {
    mockPathname = '/dashboard';
    mockUseAuth.mockReturnValue({ role: 'SystemAdmin' });
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Exchange Rates' })).toHaveAttribute('href', '/admin/exchange-rates');
  });

  it('hides the Exchange Rates link from a non-SystemAdmin role', () => {
    mockPathname = '/dashboard';
    mockUseAuth.mockReturnValue({ role: 'Employee' });
    render(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'Exchange Rates' })).not.toBeInTheDocument();
  });

  it('shows the Rate Cards link to a SystemAdmin and links it to /admin/rate-cards', () => {
    mockPathname = '/dashboard';
    mockUseAuth.mockReturnValue({ role: 'SystemAdmin' });
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Rate Cards' })).toHaveAttribute('href', '/admin/rate-cards');
  });

  it('hides the Rate Cards link from a non-SystemAdmin role', () => {
    mockPathname = '/dashboard';
    mockUseAuth.mockReturnValue({ role: 'Employee' });
    render(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'Rate Cards' })).not.toBeInTheDocument();
  });

  it('shows the Countries link to a SystemAdmin and links it to /admin/countries', () => {
    mockPathname = '/dashboard';
    mockUseAuth.mockReturnValue({ role: 'SystemAdmin' });
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Countries' })).toHaveAttribute('href', '/admin/countries');
  });

  it('hides the Countries link from a non-SystemAdmin role', () => {
    mockPathname = '/dashboard';
    mockUseAuth.mockReturnValue({ role: 'Employee' });
    render(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'Countries' })).not.toBeInTheDocument();
  });

  it('shows the Resource Role Types link to a SystemAdmin and links it to /admin/resource-role-types', () => {
    mockPathname = '/dashboard';
    mockUseAuth.mockReturnValue({ role: 'SystemAdmin' });
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Resource Role Types' })).toHaveAttribute(
      'href',
      '/admin/resource-role-types'
    );
  });

  it('hides the Resource Role Types link from a non-SystemAdmin role', () => {
    mockPathname = '/dashboard';
    mockUseAuth.mockReturnValue({ role: 'Employee' });
    render(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'Resource Role Types' })).not.toBeInTheDocument();
  });

  it('gives the nav list its own independent scroll container, separate from the surrounding shell', () => {
    mockPathname = '/dashboard';
    mockUseAuth.mockReturnValue({ role: 'SystemAdmin' });
    const { container } = render(<Sidebar />);

    const navList = container.querySelector('.sidebar-scrollbar');
    expect(navList).toBeInTheDocument();
    expect(navList).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
  });

  it('shows the Billing/Invoices item to a ProjectAdmin but hides it from an Employee', () => {
    mockPathname = '/dashboard';
    mockUseAuth.mockReturnValue({ role: 'ProjectAdmin' });
    const { rerender } = render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Invoices' })).toHaveAttribute('href', '/invoices');

    mockUseAuth.mockReturnValue({ role: 'Employee' });
    rerender(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'Invoices' })).not.toBeInTheDocument();
  });

  it('links the bottom user profile icon/name to the Profile page', () => {
    mockPathname = '/dashboard';
    mockUseAuth.mockReturnValue({
      role: 'Employee',
      user: { firstName: 'Jane', lastName: 'Doe', role: 'Employee' },
      logout: jest.fn(),
      isLoggingOut: false,
    });
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /jane doe/i })).toHaveAttribute('href', '/profile');
  });

  it('marks the user profile link as the current page when already on /profile', () => {
    mockPathname = '/profile';
    mockUseAuth.mockReturnValue({
      role: 'Employee',
      user: { firstName: 'Jane', lastName: 'Doe', role: 'Employee' },
      logout: jest.fn(),
      isLoggingOut: false,
    });
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /jane doe/i })).toHaveAttribute('aria-current', 'page');
  });

  it('still exposes a separate Sign out control alongside the profile link', () => {
    mockPathname = '/dashboard';
    const logout = jest.fn();
    mockUseAuth.mockReturnValue({
      role: 'Employee',
      user: { firstName: 'Jane', lastName: 'Doe', role: 'Employee' },
      logout,
      isLoggingOut: false,
    });
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });
});
