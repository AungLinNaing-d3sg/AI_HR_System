import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useUpdateResourceRoleType } from './useUpdateResourceRoleType';
import type { ResourceRoleType } from '@/types/domain.types';

jest.mock('../lib/api/resourceRoleTypes.api', () => ({
  updateResourceRoleType: jest.fn(),
}));

const resourceRoleTypesApi = jest.requireMock('../lib/api/resourceRoleTypes.api') as {
  updateResourceRoleType: jest.Mock;
};

const updatedRoleType: ResourceRoleType = {
  id: '33f724ff-c089-4691-8fe1-5d3ecc41ba1b',
  name: 'Senior Software Engineer',
  description: 'Senior full-stack software engineer role',
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const values = { name: 'Senior Software Engineer', description: 'Senior full-stack software engineer role' };

describe('useUpdateResourceRoleType', () => {
  beforeEach(() => {
    resourceRoleTypesApi.updateResourceRoleType.mockReset();
  });

  it('calls updateResourceRoleType with the given id and values', async () => {
    resourceRoleTypesApi.updateResourceRoleType.mockResolvedValue(updatedRoleType);
    const { result } = renderHook(
      () => useUpdateResourceRoleType('33f724ff-c089-4691-8fe1-5d3ecc41ba1b'),
      { wrapper }
    );

    await act(async () => {
      await result.current.updateResourceRoleType(values);
    });

    expect(resourceRoleTypesApi.updateResourceRoleType).toHaveBeenCalledWith(
      '33f724ff-c089-4691-8fe1-5d3ecc41ba1b',
      values
    );
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    resourceRoleTypesApi.updateResourceRoleType.mockRejectedValue(new Error('Could not update.'));
    const { result } = renderHook(
      () => useUpdateResourceRoleType('33f724ff-c089-4691-8fe1-5d3ecc41ba1b'),
      { wrapper }
    );

    await act(async () => {
      try {
        await result.current.updateResourceRoleType(values);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
