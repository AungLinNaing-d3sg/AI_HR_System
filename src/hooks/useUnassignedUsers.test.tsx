import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useUnassignedUsers } from './useUnassignedUsers';
import type { UnassignedUser } from '@/types/domain.types';

jest.mock('../lib/api/projects.api', () => ({
  getUnassignedUsers: jest.fn(),
}));

const projectsApi = jest.requireMock('../lib/api/projects.api') as { getUnassignedUsers: jest.Mock };

const users: UnassignedUser[] = [{ userId: 'user-2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' }];

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useUnassignedUsers', () => {
  beforeEach(() => {
    projectsApi.getUnassignedUsers.mockReset();
  });

  it('returns the candidate user list once loaded', async () => {
    projectsApi.getUnassignedUsers.mockResolvedValue(users);
    const { result } = renderHook(() => useUnassignedUsers('project-1'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.users).toEqual(users);
  });

  it('defaults to an empty array before data loads', () => {
    projectsApi.getUnassignedUsers.mockResolvedValue(users);
    const { result } = renderHook(() => useUnassignedUsers('project-1'), { wrapper });
    expect(result.current.users).toEqual([]);
  });

  it('does not fetch when projectId is empty', () => {
    renderHook(() => useUnassignedUsers(''), { wrapper });
    expect(projectsApi.getUnassignedUsers).not.toHaveBeenCalled();
  });
});
