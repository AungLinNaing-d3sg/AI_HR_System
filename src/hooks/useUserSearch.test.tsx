import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useUserSearch } from './useUserSearch';
import type { UserListItem } from '@/types/domain.types';

jest.mock('../lib/api/auth.api', () => ({
  searchUsers: jest.fn(),
}));

const authApi = jest.requireMock('../lib/api/auth.api') as { searchUsers: jest.Mock };

const users: UserListItem[] = [{ userId: 'user-2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' }];

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useUserSearch', () => {
  beforeEach(() => {
    authApi.searchUsers.mockReset();
  });

  it('does not call the API when the query is shorter than the minimum length', () => {
    const { result } = renderHook(() => useUserSearch('j'), { wrapper });
    expect(authApi.searchUsers).not.toHaveBeenCalled();
    expect(result.current.users).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('does not call the API for a blank/whitespace-only query', () => {
    renderHook(() => useUserSearch('   '), { wrapper });
    expect(authApi.searchUsers).not.toHaveBeenCalled();
  });

  it('searches once the query reaches the minimum length and returns the results', async () => {
    authApi.searchUsers.mockResolvedValue(users);
    const { result } = renderHook(() => useUserSearch('ja'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(authApi.searchUsers).toHaveBeenCalledWith('ja');
    expect(result.current.users).toEqual(users);
  });

  it('trims the query before checking its length and searching', async () => {
    authApi.searchUsers.mockResolvedValue(users);
    renderHook(() => useUserSearch('  ja  '), { wrapper });

    await waitFor(() => expect(authApi.searchUsers).toHaveBeenCalledWith('ja'));
  });

  it('surfaces an error message on failure', async () => {
    authApi.searchUsers.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useUserSearch('jane'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
