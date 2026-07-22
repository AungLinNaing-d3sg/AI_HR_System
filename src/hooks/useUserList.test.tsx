import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useUserList } from './useUserList';
import type { UserListItem } from '@/types/domain.types';

jest.mock('../lib/api/auth.api', () => ({
  getUserList: jest.fn(),
}));

const authApi = jest.requireMock('../lib/api/auth.api') as { getUserList: jest.Mock };

const users: UserListItem[] = [{ userId: 'user-2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' }];

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useUserList', () => {
  beforeEach(() => {
    authApi.getUserList.mockReset();
  });

  it('returns the candidate user list once loaded', async () => {
    authApi.getUserList.mockResolvedValue(users);
    const { result } = renderHook(() => useUserList(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.users).toEqual(users);
  });

  it('defaults to an empty array before data loads', () => {
    authApi.getUserList.mockResolvedValue(users);
    const { result } = renderHook(() => useUserList(), { wrapper });
    expect(result.current.users).toEqual([]);
  });

  it('surfaces an error message on failure', async () => {
    authApi.getUserList.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useUserList(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
