import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { UsersTable } from './UsersTable';
import { useAuthStore } from '@/stores/auth.store';
import { useKnownUserRolesStore } from '@/stores/knownUserRoles.store';
import type { AdminUserListItem, AuthenticatedUser } from '@/types/domain.types';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../../lib/api/auth.api', () => ({
  getUsers: jest.fn(),
  updateUser: jest.fn(),
  getRoles: jest.fn(),
  getCountries: jest.fn(),
}));

jest.mock('../../lib/api/countries.api', () => ({
  getCountries: jest.fn(),
}));

const authApi = jest.requireMock('../../lib/api/auth.api') as {
  getUsers: jest.Mock;
  updateUser: jest.Mock;
  getRoles: jest.Mock;
};
const countriesApi = jest.requireMock('../../lib/api/countries.api') as { getCountries: jest.Mock };

const systemAdmin: AuthenticatedUser = {
  id: 'user-1',
  username: 'admin',
  email: 'admin@hrsystem.com',
  firstName: 'System',
  lastName: 'Admin',
  employeeId: null,
  countryId: null,
  role: 'SystemAdmin',
};

function makeUser(overrides: Partial<AdminUserListItem>): AdminUserListItem {
  return {
    userId: 'user-1',
    username: 'system.admin',
    firstName: 'System',
    lastName: 'Admin',
    email: 'admin@hrsystem.com',
    employeeId: null,
    roleName: null,
    countryId: null,
    countryCode: null,
    countryName: null,
    isActive: true,
    ...overrides,
  };
}

const users: AdminUserListItem[] = [
  makeUser({ userId: 'user-1', firstName: 'System', lastName: 'Admin', email: 'admin@hrsystem.com' }),
  makeUser({
    userId: 'user-2',
    username: 'sarah.chen',
    firstName: 'Sarah',
    lastName: 'Chen',
    email: 'sarah@hrsystem.com',
    roleName: 'ProjectAdmin',
    countryId: 'country-1',
    countryCode: 'SG',
    countryName: 'Singapore',
  }),
  makeUser({
    userId: 'user-3',
    username: 'alex.kumar',
    firstName: 'Alex',
    lastName: 'Kumar',
    email: 'alex@hrsystem.com',
    isActive: false,
  }),
];

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('UsersTable', () => {
  beforeEach(() => {
    authApi.getUsers.mockReset();
    authApi.updateUser.mockReset();
    authApi.getRoles.mockReset();
    authApi.getRoles.mockResolvedValue([]);
    countriesApi.getCountries.mockReset();
    countriesApi.getCountries.mockResolvedValue([]);
    useAuthStore.setState({ user: null, hasHydrated: true });
    useKnownUserRolesStore.setState({ roleNameByUserId: {} });
    window.sessionStorage.clear();
  });

  it('shows a loading state initially', () => {
    authApi.getUsers.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<UsersTable />);
    expect(screen.getByText(/loading users/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no users', async () => {
    authApi.getUsers.mockResolvedValue({ users: [], totalCount: 0 });
    renderWithProviders(<UsersTable />);
    expect(await screen.findByText(/no users yet/i)).toBeInTheDocument();
  });

  it('shows an error state with a retry action when the list fails to load', async () => {
    authApi.getUsers.mockRejectedValue(new Error('network down'));
    renderWithProviders(<UsersTable />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders a row per user with name and email', async () => {
    authApi.getUsers.mockResolvedValue({ users, totalCount: 3 });
    renderWithProviders(<UsersTable />);

    const table = await screen.findByRole('table');
    expect(within(table).getByText('System Admin')).toBeInTheDocument();
    expect(within(table).getByText('Sarah Chen')).toBeInTheDocument();
    expect(within(table).getByText('alex@hrsystem.com')).toBeInTheDocument();
  });

  it('renders the Country column, using the country name and falling back to a dash', async () => {
    authApi.getUsers.mockResolvedValue({ users, totalCount: 3 });
    renderWithProviders(<UsersTable />);

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Singapore')).toBeInTheDocument();
    expect(within(table).getAllByText('—')).toHaveLength(2);
  });

  it('renders a role badge straight from the API response when roleName is present', async () => {
    authApi.getUsers.mockResolvedValue({ users, totalCount: 3 });
    renderWithProviders(<UsersTable />);

    const table = await screen.findByRole('table');
    const row = within(table).getByText('Sarah Chen').closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText('Project Admin')).toBeInTheDocument();
  });

  it("shows a confirmed role badge for the signed-in admin's own row when the API doesn't return one", async () => {
    useAuthStore.setState({ user: systemAdmin, hasHydrated: true });
    authApi.getUsers.mockResolvedValue({ users, totalCount: 3 });
    renderWithProviders(<UsersTable />);

    const table = await screen.findByRole('table');
    const row = within(table).getByText('admin@hrsystem.com').closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getAllByText('System Admin')).toHaveLength(2);
  });

  it('renders "Role unavailable" for a row with no confirmed role from any source', async () => {
    authApi.getUsers.mockResolvedValue({ users, totalCount: 3 });
    renderWithProviders(<UsersTable />);

    const table = await screen.findByRole('table');
    const row = within(table).getByText('Alex Kumar').closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText('Role unavailable')).toBeInTheDocument();
  });

  it('shows the total user count across all roles', async () => {
    authApi.getUsers.mockResolvedValue({ users, totalCount: 3 });
    renderWithProviders(<UsersTable />);

    expect(await screen.findByText('3 users across all roles.')).toBeInTheDocument();
  });

  it('notes when more users exist than the page returned', async () => {
    authApi.getUsers.mockResolvedValue({ users, totalCount: 150 });
    renderWithProviders(<UsersTable />);

    expect(await screen.findByText(/showing the first 3 of 150 users/i)).toBeInTheDocument();
  });

  it('renders a Status badge reflecting each row\'s isActive flag', async () => {
    authApi.getUsers.mockResolvedValue({ users, totalCount: 3 });
    renderWithProviders(<UsersTable />);

    const table = await screen.findByRole('table');
    const activeRow = within(table).getByText('Sarah Chen').closest('tr');
    const inactiveRow = within(table).getByText('Alex Kumar').closest('tr');
    expect(within(activeRow as HTMLElement).getByText('Active')).toBeInTheDocument();
    expect(within(inactiveRow as HTMLElement).getByText('Inactive')).toBeInTheDocument();
  });

  it('opens the edit modal for a row when its Edit action is clicked', async () => {
    const user = userEvent.setup();
    authApi.getUsers.mockResolvedValue({ users, totalCount: 3 });
    renderWithProviders(<UsersTable />);

    const table = await screen.findByRole('table');
    const row = within(table).getByText('Sarah Chen').closest('tr') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: /edit/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Edit user' })).toBeInTheDocument();
  });

  it('disables the Deactivate action for the signed-in admin\'s own row', async () => {
    useAuthStore.setState({ user: systemAdmin, hasHydrated: true });
    authApi.getUsers.mockResolvedValue({ users, totalCount: 3 });
    renderWithProviders(<UsersTable />);

    const table = await screen.findByRole('table');
    const row = within(table).getByText('admin@hrsystem.com').closest('tr') as HTMLElement;
    expect(within(row).getByRole('button', { name: /deactivate/i })).toBeDisabled();
  });

  it('deactivates an active user after confirming the dialog', async () => {
    const user = userEvent.setup();
    authApi.getUsers.mockResolvedValue({ users, totalCount: 3 });
    authApi.updateUser.mockResolvedValue({ ...users[1], isActive: false });
    renderWithProviders(<UsersTable />);

    const table = await screen.findByRole('table');
    const row = within(table).getByText('Sarah Chen').closest('tr') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: /deactivate/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/deactivate user/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() =>
      expect(authApi.updateUser).toHaveBeenCalledWith(
        'user-2',
        expect.objectContaining({ isActive: false, username: 'sarah.chen' })
      )
    );
  });

  it('shows an Activate action for an already-inactive user', async () => {
    authApi.getUsers.mockResolvedValue({ users, totalCount: 3 });
    renderWithProviders(<UsersTable />);

    const table = await screen.findByRole('table');
    const row = within(table).getByText('Alex Kumar').closest('tr') as HTMLElement;
    expect(within(row).getByRole('button', { name: /activate/i })).toBeInTheDocument();
  });
});
