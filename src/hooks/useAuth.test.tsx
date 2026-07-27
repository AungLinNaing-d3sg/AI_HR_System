import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useAuth } from './useAuth';
import { useAuthStore } from '@/stores/auth.store';
import type { AuthenticatedUser } from '@/types/domain.types';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../lib/api/auth.api', () => ({
  login: jest.fn(),
  logout: jest.fn(),
}));

const authApi = jest.requireMock('../lib/api/auth.api') as {
  login: jest.Mock;
  logout: jest.Mock;
};

const user: AuthenticatedUser = {
  id: 'user-1',
  username: 'jdoe',
  email: 'jdoe@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  employeeId: null,
  countryId: null,
  role: 'User',
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useAuth', () => {
  beforeEach(() => {
    authApi.login.mockReset();
    authApi.logout.mockReset();
    mockPush.mockReset();
    useAuthStore.setState({ user: null, hasHydrated: true });
  });

  it('starts unauthenticated', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('stores the user and reports authenticated state after a successful login', async () => {
    authApi.login.mockResolvedValue(user);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ usernameOrEmail: 'jdoe', password: 'Password@123' });
    });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user).toEqual(user);
    expect(result.current.role).toBe('User');
  });

  it('surfaces a login error message without authenticating', async () => {
    authApi.login.mockRejectedValue(new Error('Invalid credentials'));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      try {
        await result.current.login({ usernameOrEmail: 'jdoe', password: 'wrong' });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.loginError).toBeTruthy());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('clears the user and redirects to /login on logout', async () => {
    authApi.logout.mockResolvedValue(undefined);
    useAuthStore.getState().setUser(user);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(useAuthStore.getState().user).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
