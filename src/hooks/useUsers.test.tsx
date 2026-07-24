import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useUsers } from './useUsers';
import type { AdminUserListItem } from '@/types/domain.types';

jest.mock('../lib/api/auth.api', () => ({
  getUsers: jest.fn(),
}));

const authApi = jest.requireMock('../lib/api/auth.api') as { getUsers: jest.Mock };

const users: AdminUserListItem[] = [
  {
    userId: 'user-2',
    username: 'jane.doe',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    employeeId: null,
    roleName: 'ProjectAdmin',
    countryId: 'country-1',
    countryCode: 'SG',
    countryName: 'Singapore',
    isActive: true,
  },
];

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useUsers', () => {
  beforeEach(() => {
    authApi.getUsers.mockReset();
  });

  it('returns the full user list and total count once loaded', async () => {
    authApi.getUsers.mockResolvedValue({ users, totalCount: 1 });
    const { result } = renderHook(() => useUsers(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.users).toEqual(users);
    expect(result.current.totalCount).toBe(1);
  });

  it('defaults to an empty array and zero count before data loads', () => {
    authApi.getUsers.mockResolvedValue({ users, totalCount: 1 });
    const { result } = renderHook(() => useUsers(), { wrapper });
    expect(result.current.users).toEqual([]);
    expect(result.current.totalCount).toBe(0);
  });

  it('surfaces an error message on failure', async () => {
    authApi.getUsers.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useUsers(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
