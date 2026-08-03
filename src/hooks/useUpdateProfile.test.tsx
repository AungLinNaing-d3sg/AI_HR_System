import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useUpdateProfile } from './useUpdateProfile';
import { useAuthStore } from '@/stores/auth.store';
import type { AuthenticatedUser } from '@/types/domain.types';

jest.mock('../lib/api/auth.api', () => ({
  updateProfile: jest.fn(),
}));

const authApi = jest.requireMock('../lib/api/auth.api') as { updateProfile: jest.Mock };

const updatedUser: AuthenticatedUser = {
  id: 'user-1',
  username: 'jdoe',
  email: 'new-email@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  employeeId: null,
  countryId: null,
  role: 'Employee',
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useUpdateProfile', () => {
  beforeEach(() => {
    authApi.updateProfile.mockReset();
    useAuthStore.setState({ user: null, hasHydrated: true });
  });

  it('syncs the auth store with the updated user on success', async () => {
    authApi.updateProfile.mockResolvedValue(updatedUser);
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      await result.current.updateProfile({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'new-email@example.com',
        countryId: null,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().user).toEqual(updatedUser);
  });

  it('surfaces an error message when the update fails', async () => {
    authApi.updateProfile.mockRejectedValue(new Error('failed'));
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      try {
        await result.current.updateProfile({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          countryId: null,
        });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
