import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useRoles } from './useRoles';
import type { Role } from '@/types/domain.types';

jest.mock('../lib/api/auth.api', () => ({
  getRoles: jest.fn(),
}));

const authApi = jest.requireMock('../lib/api/auth.api') as { getRoles: jest.Mock };

const roles: Role[] = [{ id: 'role-1', name: 'SystemAdmin', description: 'Full system access' }];

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useRoles', () => {
  beforeEach(() => {
    authApi.getRoles.mockReset();
  });

  it('returns the role list once loaded', async () => {
    authApi.getRoles.mockResolvedValue(roles);
    const { result } = renderHook(() => useRoles(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.roles).toEqual(roles);
  });

  it('defaults to an empty array before data loads', () => {
    authApi.getRoles.mockResolvedValue(roles);
    const { result } = renderHook(() => useRoles(), { wrapper });
    expect(result.current.roles).toEqual([]);
  });

  it('surfaces an error message on failure', async () => {
    authApi.getRoles.mockRejectedValue(new Error('forbidden'));
    const { result } = renderHook(() => useRoles(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
