import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { UserEditForm } from './UserEditForm';
import type { AdminUserListItem, Country, Role } from '@/types/domain.types';

jest.mock('../../lib/api/auth.api', () => ({
  updateUser: jest.fn(),
  getRoles: jest.fn(),
}));

jest.mock('../../lib/api/countries.api', () => ({
  getCountries: jest.fn(),
}));

const authApi = jest.requireMock('../../lib/api/auth.api') as {
  updateUser: jest.Mock;
  getRoles: jest.Mock;
};
const countriesApi = jest.requireMock('../../lib/api/countries.api') as { getCountries: jest.Mock };

const roles: Role[] = [
  { id: '11111111-1111-1111-1111-111111111101', name: 'SystemAdmin', description: 'Full system access' },
  { id: '11111111-1111-1111-1111-111111111102', name: 'ProjectAdmin', description: null },
];

const countries: Country[] = [
  { id: '22222222-2222-2222-2222-222222222201', code: 'SG', name: 'Singapore' },
  { id: '22222222-2222-2222-2222-222222222202', code: 'US', name: 'United States' },
];

const user: AdminUserListItem = {
  userId: 'user-2',
  username: 'jane.doe',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  employeeId: 'EMP-002',
  roleName: 'ProjectAdmin',
  countryId: '22222222-2222-2222-2222-222222222201',
  countryCode: 'SG',
  countryName: 'Singapore',
  isActive: true,
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('UserEditForm', () => {
  const onSuccess = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    onSuccess.mockReset();
    onCancel.mockReset();
    authApi.updateUser.mockReset();
    authApi.getRoles.mockReset();
    authApi.getRoles.mockResolvedValue(roles);
    countriesApi.getCountries.mockReset();
    countriesApi.getCountries.mockResolvedValue({ countries, totalCount: countries.length });
  });

  it('pre-fills every editable field from the given user', async () => {
    renderWithProviders(<UserEditForm user={user} onSuccess={onSuccess} onCancel={onCancel} />);

    expect(screen.getByLabelText('Username')).toHaveValue('jane.doe');
    expect(screen.getByLabelText('Email')).toHaveValue('jane@example.com');
    expect(screen.getByLabelText('First name')).toHaveValue('Jane');
    expect(screen.getByLabelText('Last name')).toHaveValue('Doe');
    expect(screen.getByLabelText('Employee ID (optional)')).toHaveValue('EMP-002');
    expect(screen.getByLabelText('Status')).toHaveValue('true');
    await screen.findByRole('option', { name: 'Singapore' });
    expect(screen.getByLabelText('Country (optional)')).toHaveValue('22222222-2222-2222-2222-222222222201');
  });

  it('shows the current role as a hint and defaults the role dropdown to "Keep current role"', async () => {
    renderWithProviders(<UserEditForm user={user} onSuccess={onSuccess} onCancel={onCancel} />);

    await screen.findByRole('option', { name: 'ProjectAdmin' });
    expect(screen.getByLabelText('Role')).toHaveValue('');
    expect(screen.getByText(/current role: projectadmin/i)).toBeInTheDocument();
  });

  it('shows a validation error and does not submit when a required field is cleared', async () => {
    const testUser = userEvent.setup();
    renderWithProviders(<UserEditForm user={user} onSuccess={onSuccess} onCancel={onCancel} />);

    await testUser.clear(screen.getByLabelText('Email'));
    await testUser.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(authApi.updateUser).not.toHaveBeenCalled();
  });

  it('submits the full payload, forwarding an empty roleId to keep the current role', async () => {
    const testUser = userEvent.setup();
    authApi.updateUser.mockResolvedValue({ ...user, firstName: 'Janet' });
    renderWithProviders(<UserEditForm user={user} onSuccess={onSuccess} onCancel={onCancel} />);
    await screen.findByRole('option', { name: 'ProjectAdmin' });

    await testUser.clear(screen.getByLabelText('First name'));
    await testUser.type(screen.getByLabelText('First name'), 'Janet');
    await testUser.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(authApi.updateUser).toHaveBeenCalledWith(
        'user-2',
        expect.objectContaining({
          username: 'jane.doe',
          email: 'jane@example.com',
          firstName: 'Janet',
          lastName: 'Doe',
          employeeId: 'EMP-002',
          countryId: '22222222-2222-2222-2222-222222222201',
          isActive: true,
          roleId: '',
        })
      )
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('submits isActive: false when Status is switched to Inactive', async () => {
    const testUser = userEvent.setup();
    authApi.updateUser.mockResolvedValue({ ...user, isActive: false });
    renderWithProviders(<UserEditForm user={user} onSuccess={onSuccess} onCancel={onCancel} />);

    await testUser.selectOptions(screen.getByLabelText('Status'), 'false');
    await testUser.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(authApi.updateUser).toHaveBeenCalledWith('user-2', expect.objectContaining({ isActive: false }))
    );
  });

  it('submits a chosen roleId to actively change the role', async () => {
    const testUser = userEvent.setup();
    authApi.updateUser.mockResolvedValue(user);
    renderWithProviders(<UserEditForm user={user} onSuccess={onSuccess} onCancel={onCancel} />);
    await screen.findByRole('option', { name: 'SystemAdmin' });

    await testUser.selectOptions(screen.getByLabelText('Role'), '11111111-1111-1111-1111-111111111101');
    await testUser.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(authApi.updateUser).toHaveBeenCalledWith(
        'user-2',
        expect.objectContaining({ roleId: '11111111-1111-1111-1111-111111111101' })
      )
    );
  });

  it('surfaces a server error without calling onSuccess', async () => {
    const testUser = userEvent.setup();
    authApi.updateUser.mockRejectedValue(new Error('Email is already taken.'));
    renderWithProviders(<UserEditForm user={user} onSuccess={onSuccess} onCancel={onCancel} />);

    await testUser.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const testUser = userEvent.setup();
    renderWithProviders(<UserEditForm user={user} onSuccess={onSuccess} onCancel={onCancel} />);

    await testUser.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
