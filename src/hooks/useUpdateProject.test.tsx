import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useUpdateProject } from './useUpdateProject';
import type { Project } from '@/types/domain.types';

jest.mock('../lib/api/projects.api', () => ({
  updateProject: jest.fn(),
}));

const projectsApi = jest.requireMock('../lib/api/projects.api') as { updateProject: jest.Mock };

const updatedProject: Project = {
  id: 'project-1',
  code: 'PRJ-001',
  name: 'Updated Project Name',
  description: null,
  clientName: null,
  clientEmail: null,
  startDate: null,
  endDate: null,
  maxDailyHours: null,
  isActive: true,
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const values = { code: 'PRJ-001', name: 'Updated Project Name', isActive: true };

describe('useUpdateProject', () => {
  beforeEach(() => {
    projectsApi.updateProject.mockReset();
  });

  it('reports success after the project is updated', async () => {
    projectsApi.updateProject.mockResolvedValue(updatedProject);
    const { result } = renderHook(() => useUpdateProject('project-1'), { wrapper });

    await act(async () => {
      await result.current.updateProject(values);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(projectsApi.updateProject).toHaveBeenCalledWith('project-1', values);
  });

  it('surfaces an error message on failure', async () => {
    projectsApi.updateProject.mockRejectedValue(new Error('conflict'));
    const { result } = renderHook(() => useUpdateProject('project-1'), { wrapper });

    await act(async () => {
      try {
        await result.current.updateProject(values);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
