import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useResourceRoleTypes } from './useResourceRoleTypes';
import type { ResourceRoleType } from '@/types/domain.types';

jest.mock('../lib/api/resourceRoleTypes.api', () => ({
  getResourceRoleTypes: jest.fn(),
}));

const resourceRoleTypesApi = jest.requireMock('../lib/api/resourceRoleTypes.api') as {
  getResourceRoleTypes: jest.Mock;
};

const roleTypes: ResourceRoleType[] = [{ id: 'role-1', name: 'Senior Developer', description: 'Senior engineer' }];

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useResourceRoleTypes', () => {
  beforeEach(() => {
    resourceRoleTypesApi.getResourceRoleTypes.mockReset();
  });

  it('returns the role type list once loaded', async () => {
    resourceRoleTypesApi.getResourceRoleTypes.mockResolvedValue({ roleTypes, totalCount: roleTypes.length });
    const { result } = renderHook(() => useResourceRoleTypes(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.roleTypes).toEqual(roleTypes);
    expect(result.current.totalCount).toBe(roleTypes.length);
  });

  it('defaults to an empty array before data loads', () => {
    resourceRoleTypesApi.getResourceRoleTypes.mockResolvedValue({ roleTypes, totalCount: roleTypes.length });
    const { result } = renderHook(() => useResourceRoleTypes(), { wrapper });
    expect(result.current.roleTypes).toEqual([]);
  });

  it('surfaces an error message on failure', async () => {
    resourceRoleTypesApi.getResourceRoleTypes.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useResourceRoleTypes(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
