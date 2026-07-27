import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useCreateResourceRoleType } from './useCreateResourceRoleType';
import type { ResourceRoleType } from '@/types/domain.types';

jest.mock('../lib/api/resourceRoleTypes.api', () => ({
  createResourceRoleType: jest.fn(),
}));

const resourceRoleTypesApi = jest.requireMock('../lib/api/resourceRoleTypes.api') as {
  createResourceRoleType: jest.Mock;
};

const createdRoleType: ResourceRoleType = {
  id: '33f724ff-c089-4691-8fe1-5d3ecc41ba1b',
  name: 'Software Engineer',
  description: 'Full-stack software engineer role',
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const values = { name: 'Software Engineer', description: 'Full-stack software engineer role' };

describe('useCreateResourceRoleType', () => {
  beforeEach(() => {
    resourceRoleTypesApi.createResourceRoleType.mockReset();
  });

  it('calls createResourceRoleType with the given values', async () => {
    resourceRoleTypesApi.createResourceRoleType.mockResolvedValue(createdRoleType);
    const { result } = renderHook(() => useCreateResourceRoleType(), { wrapper });

    await act(async () => {
      await result.current.createResourceRoleType(values);
    });

    expect(resourceRoleTypesApi.createResourceRoleType).toHaveBeenCalledWith(values);
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    resourceRoleTypesApi.createResourceRoleType.mockRejectedValue(new Error('Role name already exists.'));
    const { result } = renderHook(() => useCreateResourceRoleType(), { wrapper });

    await act(async () => {
      try {
        await result.current.createResourceRoleType(values);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
