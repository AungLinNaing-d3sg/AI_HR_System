import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import type { ReactNode } from 'react';
import { ChangePasswordForm } from './ChangePasswordForm';

jest.mock('../../lib/api/auth.api', () => ({
  changePassword: jest.fn(),
}));

const authApi = jest.requireMock('../../lib/api/auth.api') as { changePassword: jest.Mock };

function renderChangePasswordForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(<ChangePasswordForm />, { wrapper: Wrapper });
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Current password'), 'WrongOldPass@123');
  await user.type(screen.getByLabelText('New password'), 'NewPass@123');
  await user.type(screen.getByLabelText('Confirm new password'), 'NewPass@123');
  await user.click(screen.getByRole('button', { name: /change password/i }));
}

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    authApi.changePassword.mockReset();
  });

  it('shows a success message when the backend confirms the change', async () => {
    authApi.changePassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderChangePasswordForm();

    await fillAndSubmit(user);

    expect(await screen.findByText('Your password has been changed.')).toBeInTheDocument();
  });

  it('does NOT show a success message when the current password is wrong - shows the backend error instead', async () => {
    // Mirrors the BFF's response.json({ message }) shape for a rejected
    // /api/auth/change-password call - regression test for the bug where a
    // wrong current password still reported success.
    authApi.changePassword.mockRejectedValue(
      new AxiosError(
        'Request failed with status code 400',
        AxiosError.ERR_BAD_REQUEST,
        undefined,
        undefined,
        {
          status: 400,
          statusText: 'Bad Request',
          headers: new AxiosHeaders(),
          config: { headers: new AxiosHeaders() },
          data: { message: 'Current password is incorrect.' },
        }
      )
    );
    const user = userEvent.setup();
    renderChangePasswordForm();

    await fillAndSubmit(user);

    expect(await screen.findByText('Current password is incorrect.')).toBeInTheDocument();
    expect(screen.queryByText('Your password has been changed.')).not.toBeInTheDocument();
  });
});
