import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useUpdateUser } from './useUpdateUser';
import type { AdminUserListItem } from '@/types/domain.types';

jest.mock('../lib/api/auth.api', () => ({
  updateUser: jest.fn(),
}));

const authApi = jest.requireMock('../lib/api/auth.api') as { updateUser: jest.Mock };

const updatedUser: AdminUserListItem = {
  userId: 'user-2',
  username: 'testedited',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  employeeId: null,
  roleName: 'SystemAdmin',
  countryId: null,
  countryCode: null,
  countryName: null,
  isActive: false,
};

const values = {
  username: 'testedited',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  employeeId: '',
  countryId: '',
  isActive: false,
  roleId: '',
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useUpdateUser', () => {
  beforeEach(() => {
    authApi.updateUser.mockReset();
  });

  it('calls updateUser with the given id and values', async () => {
    authApi.updateUser.mockResolvedValue(updatedUser);
    const { result } = renderHook(() => useUpdateUser(), { wrapper });

    await act(async () => {
      await result.current.updateUser({ id: 'user-2', values });
    });

    expect(authApi.updateUser).toHaveBeenCalledWith('user-2', values);
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    authApi.updateUser.mockRejectedValue(new Error('Could not update.'));
    const { result } = renderHook(() => useUpdateUser(), { wrapper });

    await act(async () => {
      try {
        await result.current.updateUser({ id: 'user-2', values });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
