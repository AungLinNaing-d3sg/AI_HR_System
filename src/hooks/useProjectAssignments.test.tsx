import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useProjectAssignments } from './useProjectAssignments';
import type { ProjectAssignment } from '@/types/domain.types';

jest.mock('../lib/api/projects.api', () => ({
  getProjectAssignments: jest.fn(),
}));

const projectsApi = jest.requireMock('../lib/api/projects.api') as { getProjectAssignments: jest.Mock };

const assignments: ProjectAssignment[] = [
  {
    id: 'assignment-1',
    userId: 'user-1',
    firstName: 'Alex',
    lastName: 'Kumar',
    email: 'alex.kumar@example.com',
    resourceRoleTypeId: 'role-1',
    roleName: 'Senior Developer',
    assignedAt: '2026-06-18T14:11:57',
    isActive: true,
  },
];

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useProjectAssignments', () => {
  beforeEach(() => {
    projectsApi.getProjectAssignments.mockReset();
  });

  it('returns the assignment list once loaded', async () => {
    projectsApi.getProjectAssignments.mockResolvedValue(assignments);
    const { result } = renderHook(() => useProjectAssignments('project-1'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.assignments).toEqual(assignments);
    expect(projectsApi.getProjectAssignments).toHaveBeenCalledWith('project-1');
  });

  it('defaults to an empty array before data loads', () => {
    projectsApi.getProjectAssignments.mockResolvedValue(assignments);
    const { result } = renderHook(() => useProjectAssignments('project-1'), { wrapper });
    expect(result.current.assignments).toEqual([]);
  });

  it('surfaces an error message on failure', async () => {
    projectsApi.getProjectAssignments.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useProjectAssignments('project-1'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });

  it('does not fetch when projectId is empty', () => {
    renderHook(() => useProjectAssignments(''), { wrapper });
    expect(projectsApi.getProjectAssignments).not.toHaveBeenCalled();
  });
});
