import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { CreateUserForm } from './CreateUserForm';
import type { AuthenticatedUser, Role } from '@/types/domain.types';

jest.mock('../../lib/api/auth.api', () => ({
  createUser: jest.fn(),
  getRoles: jest.fn(),
}));

const authApi = jest.requireMock('../../lib/api/auth.api') as {
  createUser: jest.Mock;
  getRoles: jest.Mock;
};

const roles: Role[] = [
  { id: '11111111-1111-1111-1111-111111111101', name: 'SystemAdmin', description: 'Full system access' },
  { id: '11111111-1111-1111-1111-111111111102', name: 'ProjectAdmin', description: null },
];

const createdUser: AuthenticatedUser = {
  id: 'user-2',
  username: 'newuser',
  email: 'newuser@example.com',
  firstName: 'New',
  lastName: 'User',
  employeeId: null,
  countryId: null,
  role: 'User',
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CreateUserForm', () => {
  beforeEach(() => {
    authApi.createUser.mockReset();
    authApi.getRoles.mockReset();
    authApi.getRoles.mockResolvedValue(roles);
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
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    expect(await screen.findByText('Please select a role.')).toBeInTheDocument();
    expect(authApi.createUser).not.toHaveBeenCalled();
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
    await user.selectOptions(screen.getByLabelText('Role'), '11111111-1111-1111-1111-111111111102');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() =>
      expect(authApi.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ roleId: '11111111-1111-1111-1111-111111111102' })
      )
    );
  });

  it('shows an error alert when roles fail to load', async () => {
    authApi.getRoles.mockRejectedValue(new Error('network down'));
    renderWithProviders(<CreateUserForm />);
    expect(await screen.findByText(/could not load roles/i)).toBeInTheDocument();
  });
});
