import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useDeleteProject } from './useDeleteProject';

jest.mock('../lib/api/projects.api', () => ({
  deleteProject: jest.fn(),
}));

const projectsApi = jest.requireMock('../lib/api/projects.api') as { deleteProject: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useDeleteProject', () => {
  beforeEach(() => {
    projectsApi.deleteProject.mockReset();
  });

  it('calls deleteProject with the given id', async () => {
    projectsApi.deleteProject.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteProject(), { wrapper });

    await act(async () => {
      await result.current.deleteProject('project-1');
    });

    expect(projectsApi.deleteProject).toHaveBeenCalledWith('project-1');
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    projectsApi.deleteProject.mockRejectedValue(new Error('in use'));
    const { result } = renderHook(() => useDeleteProject(), { wrapper });

    await act(async () => {
      try {
        await result.current.deleteProject('project-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
