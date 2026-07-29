import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ResetPasswordFormModal } from './ResetPasswordFormModal';
import type { AdminUserListItem } from '@/types/domain.types';

jest.mock('../../lib/api/auth.api', () => ({
  resetPassword: jest.fn(() => new Promise(() => {})),
}));

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

describe('ResetPasswordFormModal', () => {
  const onSuccess = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    onSuccess.mockReset();
    onClose.mockReset();
  });

  it('renders nothing when closed', () => {
    renderWithProviders(<ResetPasswordFormModal open={false} onSuccess={onSuccess} onClose={onClose} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders nothing when open but no user is given', () => {
    renderWithProviders(<ResetPasswordFormModal open user={undefined} onSuccess={onSuccess} onClose={onClose} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the "Reset password" title and the target user\'s name/email when open with a user', () => {
    renderWithProviders(<ResetPasswordFormModal open user={user} onSuccess={onSuccess} onClose={onClose} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reset password' })).toBeInTheDocument();
    expect(screen.getByText(/jane doe/i)).toBeInTheDocument();
    expect(screen.getByText(/jane@example\.com/i)).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const testUser = userEvent.setup();
    renderWithProviders(<ResetPasswordFormModal open user={user} onSuccess={onSuccess} onClose={onClose} />);

    await testUser.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape', async () => {
    const testUser = userEvent.setup();
    renderWithProviders(<ResetPasswordFormModal open user={user} onSuccess={onSuccess} onClose={onClose} />);

    await testUser.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
