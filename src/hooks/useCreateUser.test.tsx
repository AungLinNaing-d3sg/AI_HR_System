import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useCreateUser } from './useCreateUser';
import type { AuthenticatedUser } from '@/types/domain.types';

jest.mock('../lib/api/auth.api', () => ({
  createUser: jest.fn(),
}));

const authApi = jest.requireMock('../lib/api/auth.api') as { createUser: jest.Mock };

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

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const values = {
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'Password@123',
  firstName: 'New',
  lastName: 'User',
  employeeId: '',
  countryId: '',
  roleId: 'role-1',
};

describe('useCreateUser', () => {
  beforeEach(() => {
    authApi.createUser.mockReset();
  });

  it('reports success after the user is created', async () => {
    authApi.createUser.mockResolvedValue(createdUser);
    const { result } = renderHook(() => useCreateUser(), { wrapper });

    await act(async () => {
      await result.current.createUser(values);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('surfaces an error message on failure (e.g. non-admin caller)', async () => {
    authApi.createUser.mockRejectedValue(new Error('forbidden'));
    const { result } = renderHook(() => useCreateUser(), { wrapper });

    await act(async () => {
      try {
        await result.current.createUser(values);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
