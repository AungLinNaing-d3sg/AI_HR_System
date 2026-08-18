import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './AppShell';

let mockPathname = '/dashboard';
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

const mockUseAuth = jest.fn();
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('AppShell', () => {
  beforeEach(() => {
    mockPathname = '/dashboard';
    mockUseAuth.mockReturnValue({
      role: 'SystemAdmin',
      hasHydrated: true,
      user: { id: 'user-1', firstName: 'Ada', lastName: 'Lovelace', role: 'SystemAdmin' },
      logout: jest.fn(),
      isLoggingOut: false,
    });
  });

  it('renders the sidebar navigation and the main content area', () => {
    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>
    );

    // The sidebar's own `<nav>` plus the header's breadcrumb `<nav>` both report role "navigation".
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
    expect(screen.getByText('HR System')).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('pins the shell to the viewport height and lets the sidebar and main content scroll independently', () => {
    const { container } = render(
      <AppShell>
        <p>Page content</p>
      </AppShell>
    );

    // Outer shell is clipped to exactly the viewport height rather than growing with content
    // (`h-screen overflow-hidden`), so the sidebar and `<main>` each own their own scrollbar.
    const shellRoot = container.firstElementChild as HTMLElement;
    expect(shellRoot).toHaveClass('h-screen', 'overflow-hidden');

    const main = screen.getByText('Page content').closest('main');
    expect(main).toHaveClass('overflow-y-auto');
  });

  it(
    'keeps the sidebar (logo, every nav section, and the profile/logout footer) fully mounted and ' +
      "the shell/main scroll classes intact when the main content is far taller than the viewport - " +
      'the exact /timesheets/history repro (33 tall rows, simulating a paginated table taller than a ' +
      'single 20-row page) for the bug where the whole document scrolled as one, eventually leaving a ' +
      'blank white screen once the (shorter) sidebar ' +
      "content had scrolled past. The fix keeps the shell pinned to `h-screen`/`overflow-hidden` and " +
      'gives the sidebar nav list and `<main>` their own independent `overflow-y-auto` regions, so ' +
      'neither the sidebar nor its footer/logo can ever be scrolled out of view.',
    () => {
      const tallContent = (
        <ul>
          {Array.from({ length: 33 }, (_, index) => (
            <li key={index} style={{ height: '80px' }}>
              Timesheet entry row {index + 1}
            </li>
          ))}
        </ul>
      );

      const { container } = render(<AppShell>{tallContent}</AppShell>);

      // The shell stays clipped to the viewport and only `<main>` scrolls,
      // regardless of how tall `children` is.
      const shellRoot = container.firstElementChild as HTMLElement;
      expect(shellRoot).toHaveClass('h-screen', 'overflow-hidden');
      const main = screen.getByText('Timesheet entry row 1').closest('main');
      expect(main).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');

      // Every row rendered (nothing was unmounted/clipped away by the layout itself).
      expect(screen.getByText('Timesheet entry row 33')).toBeInTheDocument();

      // The sidebar logo, every nav section, and the profile/logout footer
      // are still present in the DOM - never removed just because `<main>`
      // grew tall enough to need its own scrollbar.
      expect(screen.getByText('HR System')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /timesheet history/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^reports$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /invoices/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument();
      expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    }
  );

  it('does not show the mobile nav drawer by default', () => {
    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>
    );

    expect(screen.queryByLabelText('Close navigation menu')).not.toBeInTheDocument();
  });

  it('opens the mobile nav drawer when the header menu button is clicked, and closes it via the overlay', async () => {
    const user = userEvent.setup();
    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>
    );

    await user.click(screen.getByLabelText('Toggle navigation menu'));
    expect(screen.getByLabelText('Close navigation menu')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Close navigation menu'));
    expect(screen.queryByLabelText('Close navigation menu')).not.toBeInTheDocument();
  });

  it('closes the mobile nav drawer when a nav link inside it is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>
    );

    await user.click(screen.getByLabelText('Toggle navigation menu'));
    const drawer = screen.getByLabelText('Close navigation menu').closest('div')!.parentElement as HTMLElement;
    // 'Projects' is visible to every role (unlike 'My Timesheets', hidden for SystemAdmin - the role this suite mocks).
    const links = screen.getAllByRole('link', { name: 'Projects' });
    // The mobile drawer renders its own `Sidebar` instance alongside the desktop one; click the last (drawer) link.
    await user.click(links[links.length - 1]);

    expect(screen.queryByLabelText('Close navigation menu')).not.toBeInTheDocument();
    expect(drawer).toBeTruthy();
  });
});
