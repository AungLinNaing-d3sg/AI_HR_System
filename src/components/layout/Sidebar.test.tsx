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
    mockUseAuth.mockReturnValue({ role: 'User' });
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
    mockUseAuth.mockReturnValue({ role: 'User' });
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
    mockUseAuth.mockReturnValue({ role: 'User' });
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
    mockUseAuth.mockReturnValue({ role: 'User' });
    render(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'Resource Role Types' })).not.toBeInTheDocument();
  });

  it('shows the Billing/Invoices item to a ProjectAdmin but hides it from a plain User', () => {
    mockPathname = '/dashboard';
    mockUseAuth.mockReturnValue({ role: 'ProjectAdmin' });
    const { rerender } = render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Invoices' })).toHaveAttribute('href', '/invoices');

    mockUseAuth.mockReturnValue({ role: 'User' });
    rerender(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'Invoices' })).not.toBeInTheDocument();
  });
});
