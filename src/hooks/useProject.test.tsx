import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useProject } from './useProject';
import type { Project } from '@/types/domain.types';

jest.mock('../lib/api/projects.api', () => ({
  getProject: jest.fn(),
}));

const projectsApi = jest.requireMock('../lib/api/projects.api') as { getProject: jest.Mock };

const project: Project = {
  id: 'project-1',
  code: 'PRJ-001',
  name: 'Sample Project',
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

describe('useProject', () => {
  beforeEach(() => {
    projectsApi.getProject.mockReset();
  });

  it('returns the project once loaded', async () => {
    projectsApi.getProject.mockResolvedValue(project);
    const { result } = renderHook(() => useProject('project-1'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.project).toEqual(project);
    expect(projectsApi.getProject).toHaveBeenCalledWith('project-1');
  });

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useProject(''), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(projectsApi.getProject).not.toHaveBeenCalled();
  });

  it('surfaces an error message on failure', async () => {
    projectsApi.getProject.mockRejectedValue(new Error('not found'));
    const { result } = renderHook(() => useProject('missing-id'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
