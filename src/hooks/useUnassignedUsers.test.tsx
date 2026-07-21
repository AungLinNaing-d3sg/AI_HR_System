import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useUnassignedUsers } from './useUnassignedUsers';
import type { UnassignedUser } from '@/types/domain.types';

jest.mock('../lib/api/auth.api', () => ({
  getUnassignedUsers: jest.fn(),
}));

const authApi = jest.requireMock('../lib/api/auth.api') as { getUnassignedUsers: jest.Mock };

const users: UnassignedUser[] = [{ userId: 'user-2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' }];

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useUnassignedUsers', () => {
  beforeEach(() => {
    authApi.getUnassignedUsers.mockReset();
  });

  it('returns the candidate user list once loaded', async () => {
    authApi.getUnassignedUsers.mockResolvedValue(users);
    const { result } = renderHook(() => useUnassignedUsers(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.users).toEqual(users);
  });

  it('defaults to an empty array before data loads', () => {
    authApi.getUnassignedUsers.mockResolvedValue(users);
    const { result } = renderHook(() => useUnassignedUsers(), { wrapper });
    expect(result.current.users).toEqual([]);
  });

  it('surfaces an error message on failure', async () => {
    authApi.getUnassignedUsers.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useUnassignedUsers(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
