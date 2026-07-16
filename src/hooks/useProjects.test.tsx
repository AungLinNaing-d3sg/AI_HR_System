import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useProjects } from './useProjects';
import type { Project } from '@/types/domain.types';

jest.mock('../lib/api/projects.api', () => ({
  getProjects: jest.fn(),
}));

const projectsApi = jest.requireMock('../lib/api/projects.api') as { getProjects: jest.Mock };

const projects: Project[] = [
  {
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
  },
];

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useProjects', () => {
  beforeEach(() => {
    projectsApi.getProjects.mockReset();
  });

  it('returns the project list once loaded', async () => {
    projectsApi.getProjects.mockResolvedValue(projects);
    const { result } = renderHook(() => useProjects(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.projects).toEqual(projects);
    expect(result.current.isError).toBe(false);
  });

  it('defaults to an empty array before data loads', () => {
    projectsApi.getProjects.mockResolvedValue(projects);
    const { result } = renderHook(() => useProjects(), { wrapper });
    expect(result.current.projects).toEqual([]);
  });

  it('surfaces an error message on failure', async () => {
    projectsApi.getProjects.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
