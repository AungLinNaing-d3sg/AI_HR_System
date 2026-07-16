import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import type { ReactNode } from 'react';
import { LoginForm } from './LoginForm';

const mockPush = jest.fn();
const mockSearchParamsGet = jest.fn().mockReturnValue(null);
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

jest.mock('../../lib/api/auth.api', () => ({
  login: jest.fn(),
}));

const authApi = jest.requireMock('../../lib/api/auth.api') as { login: jest.Mock };

function renderLoginForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(<LoginForm />, { wrapper: Wrapper });
}

describe('LoginForm', () => {
  beforeEach(() => {
    authApi.login.mockReset();
    mockPush.mockReset();
    mockSearchParamsGet.mockReturnValue(null);
  });

  it('shows validation errors instead of submitting when fields are empty', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Username or email is required.')).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('submits valid credentials and redirects to /profile by default', async () => {
    authApi.login.mockResolvedValue({ id: 'user-1', role: 'User' });
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByLabelText(/username or email/i), 'jdoe');
    await user.type(screen.getByLabelText(/password/i), 'Password@123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(authApi.login).toHaveBeenCalledWith({
        usernameOrEmail: 'jdoe',
        password: 'Password@123',
      })
    );
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/profile'));
  });

  it('honors a same-origin ?redirect= target', async () => {
    authApi.login.mockResolvedValue({ id: 'user-1', role: 'User' });
    mockSearchParamsGet.mockReturnValue('/admin/users/create');
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByLabelText(/username or email/i), 'admin');
    await user.type(screen.getByLabelText(/password/i), 'Password@123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/users/create'));
  });

  it('ignores an off-site ?redirect= value and falls back to /profile', async () => {
    authApi.login.mockResolvedValue({ id: 'user-1', role: 'User' });
    mockSearchParamsGet.mockReturnValue('https://evil.example.com');
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByLabelText(/username or email/i), 'jdoe');
    await user.type(screen.getByLabelText(/password/i), 'Password@123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/profile'));
  });

  it('shows a server-side error message when login fails', async () => {
    authApi.login.mockRejectedValue(
      new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 401,
        statusText: '',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
        data: { message: 'Invalid username/email or password.' },
      })
    );
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByLabelText(/username or email/i), 'jdoe');
    await user.type(screen.getByLabelText(/password/i), 'wrong-Password@1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username/email or password.');
  });
});
