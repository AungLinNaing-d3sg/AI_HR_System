import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useProjectList } from './useProjectList';
import type { Project } from '@/types/domain.types';

const mockUseAuth = jest.fn();
jest.mock('./useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../lib/api/projects.api', () => ({
  getProjects: jest.fn(),
  getMyProjects: jest.fn(),
}));

const projectsApi = jest.requireMock('../lib/api/projects.api') as {
  getProjects: jest.Mock;
  getMyProjects: jest.Mock;
};

const allProjects: Project[] = [
  {
    id: 'project-1',
    code: 'PRJ-001',
    name: 'Every Project',
    description: null,
    clientName: null,
    clientEmail: null,
    startDate: null,
    endDate: null,
    maxDailyHours: null,
    isActive: true,
  },
];

const myProjects: Project[] = [
  {
    id: 'project-2',
    code: 'PRJ-002',
    name: 'My Own Project',
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

describe('useProjectList', () => {
  beforeEach(() => {
    projectsApi.getProjects.mockReset();
    projectsApi.getMyProjects.mockReset();
    mockUseAuth.mockReset();
  });

  it('uses GetMyProjectList (getMyProjects) for a ProjectAdmin caller', async () => {
    mockUseAuth.mockReturnValue({ role: 'ProjectAdmin' });
    projectsApi.getMyProjects.mockResolvedValue(myProjects);
    projectsApi.getProjects.mockResolvedValue(allProjects);

    const { result } = renderHook(() => useProjectList(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.projects).toEqual(myProjects);
    expect(projectsApi.getMyProjects).toHaveBeenCalled();
    expect(projectsApi.getProjects).not.toHaveBeenCalled();
  });

  it('uses GetProjectList (getProjects) for a SystemAdmin caller', async () => {
    mockUseAuth.mockReturnValue({ role: 'SystemAdmin' });
    projectsApi.getMyProjects.mockResolvedValue(myProjects);
    projectsApi.getProjects.mockResolvedValue(allProjects);

    const { result } = renderHook(() => useProjectList(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.projects).toEqual(allProjects);
    expect(projectsApi.getProjects).toHaveBeenCalled();
    expect(projectsApi.getMyProjects).not.toHaveBeenCalled();
  });

  it('uses GetMyProjectList (getMyProjects) for a plain User (Employee) caller', async () => {
    mockUseAuth.mockReturnValue({ role: 'Employee' });
    projectsApi.getMyProjects.mockResolvedValue(myProjects);
    projectsApi.getProjects.mockResolvedValue(allProjects);

    const { result } = renderHook(() => useProjectList(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.projects).toEqual(myProjects);
    expect(projectsApi.getMyProjects).toHaveBeenCalled();
    expect(projectsApi.getProjects).not.toHaveBeenCalled();
  });

  it('falls back to GetProjectList (getProjects) for any other role', async () => {
    mockUseAuth.mockReturnValue({ role: 'Guest' });
    projectsApi.getProjects.mockResolvedValue(allProjects);

    const { result } = renderHook(() => useProjectList(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.projects).toEqual(allProjects);
    expect(projectsApi.getMyProjects).not.toHaveBeenCalled();
  });
});
