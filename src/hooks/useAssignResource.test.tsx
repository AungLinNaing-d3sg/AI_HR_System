import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useAssignResource } from './useAssignResource';
import type { ProjectAssignment } from '@/types/domain.types';

jest.mock('../lib/api/projects.api', () => ({
  assignResource: jest.fn(),
}));

const projectsApi = jest.requireMock('../lib/api/projects.api') as { assignResource: jest.Mock };

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

describe('useAssignResource', () => {
  beforeEach(() => {
    projectsApi.assignResource.mockReset();
  });

  it('assigns the resource and returns the refreshed assignment list', async () => {
    projectsApi.assignResource.mockResolvedValue(assignments);
    const { result } = renderHook(() => useAssignResource('project-1'), { wrapper });

    let returned: ProjectAssignment[] | undefined;
    await act(async () => {
      returned = await result.current.assignResource({ userId: 'user-1', resourceRoleTypeId: 'role-1' });
    });

    expect(returned).toEqual(assignments);
    expect(projectsApi.assignResource).toHaveBeenCalledWith('project-1', {
      userId: 'user-1',
      resourceRoleTypeId: 'role-1',
    });
  });

  it('surfaces an error message on failure', async () => {
    projectsApi.assignResource.mockRejectedValue(new Error('user already assigned'));
    const { result } = renderHook(() => useAssignResource('project-1'), { wrapper });

    await act(async () => {
      try {
        await result.current.assignResource({ userId: 'user-1', resourceRoleTypeId: 'role-1' });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
