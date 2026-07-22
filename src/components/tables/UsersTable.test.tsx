import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { UsersTable } from './UsersTable';
import { useAuthStore } from '@/stores/auth.store';
import { useKnownUserRolesStore } from '@/stores/knownUserRoles.store';
import type { AuthenticatedUser, UserListItem } from '@/types/domain.types';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../../lib/api/auth.api', () => ({
  getUsers: jest.fn(),
}));

const authApi = jest.requireMock('../../lib/api/auth.api') as { getUsers: jest.Mock };

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

const users: UserListItem[] = [
  { userId: 'user-1', firstName: 'System', lastName: 'Admin', email: 'admin@hrsystem.com' },
  { userId: 'user-2', firstName: 'Sarah', lastName: 'Chen', email: 'sarah@hrsystem.com' },
  { userId: 'user-3', firstName: 'Alex', lastName: 'Kumar', email: 'alex@hrsystem.com' },
];

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('UsersTable', () => {
  beforeEach(() => {
    authApi.getUsers.mockReset();
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

  it('shows a confirmed role badge for the signed-in admin\'s own row', async () => {
    useAuthStore.setState({ user: systemAdmin, hasHydrated: true });
    authApi.getUsers.mockResolvedValue({ users, totalCount: 3 });
    renderWithProviders(<UsersTable />);

    const table = await screen.findByRole('table');
    const row = within(table).getByText('admin@hrsystem.com').closest('tr');
    expect(row).not.toBeNull();
    // The row's own name cell and its confirmed role badge both happen to read
    // "System Admin" here (this account's name matches its role) - both appear.
    expect(within(row as HTMLElement).getAllByText('System Admin')).toHaveLength(2);
  });

  it('shows a confirmed role badge for a user created this session', async () => {
    useKnownUserRolesStore.getState().recordUserRole('user-2', 'ProjectAdmin');
    authApi.getUsers.mockResolvedValue({ users, totalCount: 3 });
    renderWithProviders(<UsersTable />);

    const table = await screen.findByRole('table');
    const row = within(table).getByText('Sarah Chen').closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText('Project Admin')).toBeInTheDocument();
  });

  it('renders "Role unavailable" for users with no confirmed role and reflects it in the count chips', async () => {
    authApi.getUsers.mockResolvedValue({ users, totalCount: 3 });
    renderWithProviders(<UsersTable />);

    const table = await screen.findByRole('table');
    // 3 rows, none with a confirmed role in this scenario (no signed-in user, no recorded roles).
    expect(within(table).getAllByText('Role unavailable')).toHaveLength(3);
    // ...and the count chip above the table reflects the same total.
    expect(screen.getAllByText('Role unavailable')).toHaveLength(4);
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
});
