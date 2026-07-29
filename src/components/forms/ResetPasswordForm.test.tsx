import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ResetPasswordForm } from './ResetPasswordForm';
import type { AdminUserListItem } from '@/types/domain.types';

jest.mock('../../lib/api/auth.api', () => ({
  resetPassword: jest.fn(),
}));

const authApi = jest.requireMock('../../lib/api/auth.api') as { resetPassword: jest.Mock };

const user: AdminUserListItem = {
  userId: 'user-2',
  username: 'jane.doe',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  employeeId: null,
  roleName: 'ProjectAdmin',
  countryId: null,
  countryCode: null,
  countryName: null,
  isActive: true,
};

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ResetPasswordForm', () => {
  const onSuccess = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    onSuccess.mockReset();
    onCancel.mockReset();
    authApi.resetPassword.mockReset();
  });

  it('shows a validation error and does not submit when the new password is too weak', async () => {
    const testUser = userEvent.setup();
    renderWithProviders(<ResetPasswordForm user={user} onSuccess={onSuccess} onCancel={onCancel} />);

    await testUser.type(screen.getByLabelText('New password'), 'weak');
    await testUser.type(screen.getByLabelText('Confirm new password'), 'weak');
    await testUser.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });

  it('shows a validation error and does not submit when the passwords do not match', async () => {
    const testUser = userEvent.setup();
    renderWithProviders(<ResetPasswordForm user={user} onSuccess={onSuccess} onCancel={onCancel} />);

    await testUser.type(screen.getByLabelText('New password'), 'NewPass@123');
    await testUser.type(screen.getByLabelText('Confirm new password'), 'Mismatch@123');
    await testUser.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });

  it('submits the new password for the given user and calls onSuccess', async () => {
    const testUser = userEvent.setup();
    authApi.resetPassword.mockResolvedValue(undefined);
    renderWithProviders(<ResetPasswordForm user={user} onSuccess={onSuccess} onCancel={onCancel} />);

    await testUser.type(screen.getByLabelText('New password'), 'NewPass@123');
    await testUser.type(screen.getByLabelText('Confirm new password'), 'NewPass@123');
    await testUser.click(screen.getByRole('button', { name: 'Reset password' }));

    await waitFor(() =>
      expect(authApi.resetPassword).toHaveBeenCalledWith('user-2', {
        newPassword: 'NewPass@123',
        confirmNewPassword: 'NewPass@123',
      })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('surfaces a server error without calling onSuccess', async () => {
    const testUser = userEvent.setup();
    authApi.resetPassword.mockRejectedValue(new Error('Could not reset the password.'));
    renderWithProviders(<ResetPasswordForm user={user} onSuccess={onSuccess} onCancel={onCancel} />);

    await testUser.type(screen.getByLabelText('New password'), 'NewPass@123');
    await testUser.type(screen.getByLabelText('Confirm new password'), 'NewPass@123');
    await testUser.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const testUser = userEvent.setup();
    renderWithProviders(<ResetPasswordForm user={user} onSuccess={onSuccess} onCancel={onCancel} />);

    await testUser.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
