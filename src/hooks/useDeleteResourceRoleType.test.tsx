import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useDeleteResourceRoleType } from './useDeleteResourceRoleType';

jest.mock('../lib/api/resourceRoleTypes.api', () => ({
  deleteResourceRoleType: jest.fn(),
}));

const resourceRoleTypesApi = jest.requireMock('../lib/api/resourceRoleTypes.api') as {
  deleteResourceRoleType: jest.Mock;
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useDeleteResourceRoleType', () => {
  beforeEach(() => {
    resourceRoleTypesApi.deleteResourceRoleType.mockReset();
  });

  it('calls deleteResourceRoleType with the given id', async () => {
    resourceRoleTypesApi.deleteResourceRoleType.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteResourceRoleType(), { wrapper });

    await act(async () => {
      await result.current.deleteResourceRoleType('role-3');
    });

    expect(resourceRoleTypesApi.deleteResourceRoleType).toHaveBeenCalledWith('role-3');
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    resourceRoleTypesApi.deleteResourceRoleType.mockRejectedValue(new Error('Role type is in use.'));
    const { result } = renderHook(() => useDeleteResourceRoleType(), { wrapper });

    await act(async () => {
      try {
        await result.current.deleteResourceRoleType('role-3');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
