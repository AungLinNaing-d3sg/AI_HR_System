import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useRemoveResource } from './useRemoveResource';

jest.mock('../lib/api/projects.api', () => ({
  removeResource: jest.fn(),
}));

const projectsApi = jest.requireMock('../lib/api/projects.api') as { removeResource: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useRemoveResource', () => {
  beforeEach(() => {
    projectsApi.removeResource.mockReset();
  });

  it('removes the assignment', async () => {
    projectsApi.removeResource.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRemoveResource('project-1'), { wrapper });

    await act(async () => {
      await result.current.removeResource('assignment-1');
    });

    expect(projectsApi.removeResource).toHaveBeenCalledWith('project-1', 'assignment-1');
  });

  it('surfaces an error message on failure', async () => {
    projectsApi.removeResource.mockRejectedValue(new Error('not found'));
    const { result } = renderHook(() => useRemoveResource('project-1'), { wrapper });

    await act(async () => {
      try {
        await result.current.removeResource('assignment-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
