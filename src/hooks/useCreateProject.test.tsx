import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useCreateProject } from './useCreateProject';
import type { Project } from '@/types/domain.types';

jest.mock('../lib/api/projects.api', () => ({
  createProject: jest.fn(),
}));

const projectsApi = jest.requireMock('../lib/api/projects.api') as { createProject: jest.Mock };

const createdProject: Project = {
  id: 'project-2',
  code: 'PRJ-002',
  name: 'New Project',
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

const values = { code: 'PRJ-002', name: 'New Project' };

describe('useCreateProject', () => {
  beforeEach(() => {
    projectsApi.createProject.mockReset();
  });

  it('reports success after the project is created', async () => {
    projectsApi.createProject.mockResolvedValue(createdProject);
    const { result } = renderHook(() => useCreateProject(), { wrapper });

    await act(async () => {
      await result.current.createProject(values);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('surfaces an error message on failure', async () => {
    projectsApi.createProject.mockRejectedValue(new Error('forbidden'));
    const { result } = renderHook(() => useCreateProject(), { wrapper });

    await act(async () => {
      try {
        await result.current.createProject(values);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
