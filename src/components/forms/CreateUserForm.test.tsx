import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { CreateUserForm } from './CreateUserForm';
import { useKnownUserRolesStore } from '@/stores/knownUserRoles.store';
import type { AuthenticatedUser, Country, Role } from '@/types/domain.types';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('../../lib/api/auth.api', () => ({
  createUser: jest.fn(),
  getRoles: jest.fn(),
}));

jest.mock('../../lib/api/countries.api', () => ({
  getCountries: jest.fn(),
}));

const authApi = jest.requireMock('../../lib/api/auth.api') as {
  createUser: jest.Mock;
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

const createdUser: AuthenticatedUser = {
  id: 'user-2',
  username: 'newuser',
  email: 'newuser@example.com',
  firstName: 'New',
  lastName: 'User',
  employeeId: null,
  countryId: null,
  role: 'Employee',
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CreateUserForm', () => {
  beforeEach(() => {
    pushMock.mockReset();
    authApi.createUser.mockReset();
    authApi.getRoles.mockReset();
    authApi.getRoles.mockResolvedValue(roles);
    countriesApi.getCountries.mockReset();
    countriesApi.getCountries.mockResolvedValue({ countries, totalCount: countries.length });
    useKnownUserRolesStore.setState({ roleNameByUserId: {} });
    window.sessionStorage.clear();
  });

  it('renders the role dropdown populated from useRoles', async () => {
    renderWithProviders(<CreateUserForm />);
    expect(await screen.findByRole('option', { name: 'SystemAdmin' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'ProjectAdmin' })).toBeInTheDocument();
  });

  it('disables the role dropdown while roles are loading', () => {
    authApi.getRoles.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<CreateUserForm />);
    expect(screen.getByLabelText('Role')).toBeDisabled();
  });

  it('shows a validation error when no role is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateUserForm />);
    await screen.findByRole('option', { name: 'SystemAdmin' });

    await user.type(screen.getByLabelText('Username'), 'jdoe');
    await user.type(screen.getByLabelText('Email'), 'jdoe@example.com');
    await user.type(screen.getByLabelText('Temporary password'), 'Password@123');
    await user.type(screen.getByLabelText('First name'), 'Jane');
    await user.type(screen.getByLabelText('Last name'), 'Doe');
    await user.click(screen.getByLabelText('Country'));
    await user.click(await screen.findByRole('option', { name: /singapore/i }));
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    expect(await screen.findByText('Please select a role.')).toBeInTheDocument();
    expect(authApi.createUser).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('shows a validation error when no country is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateUserForm />);
    await screen.findByRole('option', { name: 'SystemAdmin' });

    await user.type(screen.getByLabelText('Username'), 'jdoe');
    await user.type(screen.getByLabelText('Email'), 'jdoe@example.com');
    await user.type(screen.getByLabelText('Temporary password'), 'Password@123');
    await user.type(screen.getByLabelText('First name'), 'Jane');
    await user.type(screen.getByLabelText('Last name'), 'Doe');
    await user.selectOptions(screen.getByLabelText('Role'), '11111111-1111-1111-1111-111111111102');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    expect(await screen.findByText('Please select a country.')).toBeInTheDocument();
    expect(authApi.createUser).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('submits the selected role id along with the rest of the form', async () => {
    const user = userEvent.setup();
    authApi.createUser.mockResolvedValue(createdUser);
    renderWithProviders(<CreateUserForm />);
    await screen.findByRole('option', { name: 'SystemAdmin' });

    await user.type(screen.getByLabelText('Username'), 'jdoe');
    await user.type(screen.getByLabelText('Email'), 'jdoe@example.com');
    await user.type(screen.getByLabelText('Temporary password'), 'Password@123');
    await user.type(screen.getByLabelText('First name'), 'Jane');
    await user.type(screen.getByLabelText('Last name'), 'Doe');
    await user.click(screen.getByLabelText('Country'));
    await user.click(await screen.findByRole('option', { name: /singapore/i }));
    await user.selectOptions(screen.getByLabelText('Role'), '11111111-1111-1111-1111-111111111102');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() =>
      expect(authApi.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ roleId: '11111111-1111-1111-1111-111111111102' })
      )
    );
  });

  it('redirects to /admin/users after a successful creation', async () => {
    const user = userEvent.setup();
    authApi.createUser.mockResolvedValue(createdUser);
    renderWithProviders(<CreateUserForm />);
    await screen.findByRole('option', { name: 'SystemAdmin' });

    await user.type(screen.getByLabelText('Username'), 'jdoe');
    await user.type(screen.getByLabelText('Email'), 'jdoe@example.com');
    await user.type(screen.getByLabelText('Temporary password'), 'Password@123');
    await user.type(screen.getByLabelText('First name'), 'Jane');
    await user.type(screen.getByLabelText('Last name'), 'Doe');
    await user.click(screen.getByLabelText('Country'));
    await user.click(await screen.findByRole('option', { name: /singapore/i }));
    await user.selectOptions(screen.getByLabelText('Role'), '11111111-1111-1111-1111-111111111102');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/admin/users'));
  });

  it('records the chosen role for the new user so the Users table can show a real badge for it', async () => {
    const user = userEvent.setup();
    authApi.createUser.mockResolvedValue(createdUser);
    renderWithProviders(<CreateUserForm />);
    await screen.findByRole('option', { name: 'SystemAdmin' });

    await user.type(screen.getByLabelText('Username'), 'jdoe');
    await user.type(screen.getByLabelText('Email'), 'jdoe@example.com');
    await user.type(screen.getByLabelText('Temporary password'), 'Password@123');
    await user.type(screen.getByLabelText('First name'), 'Jane');
    await user.type(screen.getByLabelText('Last name'), 'Doe');
    await user.click(screen.getByLabelText('Country'));
    await user.click(await screen.findByRole('option', { name: /singapore/i }));
    await user.selectOptions(screen.getByLabelText('Role'), '11111111-1111-1111-1111-111111111102');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() =>
      expect(useKnownUserRolesStore.getState().roleNameByUserId[createdUser.id]).toBe('ProjectAdmin')
    );
  });

  it('does not navigate away when the backend rejects the submission', async () => {
    const user = userEvent.setup();
    authApi.createUser.mockRejectedValue(new Error('Username is already taken.'));
    renderWithProviders(<CreateUserForm />);
    await screen.findByRole('option', { name: 'SystemAdmin' });

    await user.type(screen.getByLabelText('Username'), 'jdoe');
    await user.type(screen.getByLabelText('Email'), 'jdoe@example.com');
    await user.type(screen.getByLabelText('Temporary password'), 'Password@123');
    await user.type(screen.getByLabelText('First name'), 'Jane');
    await user.type(screen.getByLabelText('Last name'), 'Doe');
    await user.click(screen.getByLabelText('Country'));
    await user.click(await screen.findByRole('option', { name: /singapore/i }));
    await user.selectOptions(screen.getByLabelText('Role'), '11111111-1111-1111-1111-111111111102');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('navigates back to /admin/users when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateUserForm />);
    await screen.findByRole('option', { name: 'SystemAdmin' });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(pushMock).toHaveBeenCalledWith('/admin/users');
  });

  it('shows an error alert when roles fail to load', async () => {
    authApi.getRoles.mockRejectedValue(new Error('network down'));
    renderWithProviders(<CreateUserForm />);
    expect(await screen.findByText(/could not load roles/i)).toBeInTheDocument();
  });

  it('renders the required country combobox populated from useCountries, showing every country once opened', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateUserForm />);

    await user.click(screen.getByLabelText('Country'));
    expect(await screen.findByRole('option', { name: /singapore/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /united states/i })).toBeInTheDocument();
  });

  it('shows a loading state in the country combobox while countries are loading', async () => {
    countriesApi.getCountries.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderWithProviders(<CreateUserForm />);

    await user.click(screen.getByLabelText('Country'));
    expect(await screen.findByText(/loading countries/i)).toBeInTheDocument();
  });

  it('does not submit without selecting a country (Country is required)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateUserForm />);
    await screen.findByRole('option', { name: 'SystemAdmin' });

    await user.type(screen.getByLabelText('Username'), 'jdoe');
    await user.type(screen.getByLabelText('Email'), 'jdoe@example.com');
    await user.type(screen.getByLabelText('Temporary password'), 'Password@123');
    await user.type(screen.getByLabelText('First name'), 'Jane');
    await user.type(screen.getByLabelText('Last name'), 'Doe');
    await user.selectOptions(screen.getByLabelText('Role'), '11111111-1111-1111-1111-111111111102');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    expect(await screen.findByText('Please select a country.')).toBeInTheDocument();
    expect(authApi.createUser).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('submits the selected country id along with the rest of the form', async () => {
    const user = userEvent.setup();
    authApi.createUser.mockResolvedValue(createdUser);
    renderWithProviders(<CreateUserForm />);
    await screen.findByRole('option', { name: 'SystemAdmin' });

    await user.type(screen.getByLabelText('Username'), 'jdoe');
    await user.type(screen.getByLabelText('Email'), 'jdoe@example.com');
    await user.type(screen.getByLabelText('Temporary password'), 'Password@123');
    await user.type(screen.getByLabelText('First name'), 'Jane');
    await user.type(screen.getByLabelText('Last name'), 'Doe');

    await user.click(screen.getByLabelText('Country'));
    await user.click(await screen.findByRole('option', { name: /singapore/i }));

    await user.selectOptions(screen.getByLabelText('Role'), '11111111-1111-1111-1111-111111111102');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() =>
      expect(authApi.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ countryId: '22222222-2222-2222-2222-222222222201' })
      )
    );
  });

  it('shows an error message in the country combobox when countries fail to load', async () => {
    countriesApi.getCountries.mockRejectedValue(new Error('network down'));
    const user = userEvent.setup();
    renderWithProviders(<CreateUserForm />);

    await user.click(screen.getByLabelText('Country'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
