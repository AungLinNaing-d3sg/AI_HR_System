/**
 * @jest-environment node
 */
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';

const mockCookieStore = {
  get: jest.fn(),
};

jest.mock('next/headers', () => ({
  cookies: () => Promise.resolve(mockCookieStore),
}));

jest.mock('../../../../../lib/api/projectsBackend.api', () => ({
  getProjectList: jest.fn(),
  getProjectAssignments: jest.fn(),
}));

const projectsBackend = jest.requireMock('../../../../../lib/api/projectsBackend.api') as {
  getProjectList: jest.Mock;
  getProjectAssignments: jest.Mock;
};

import { GET } from './route';

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

function tokenFor(role: string): string {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ role, exp: futureExp });
}

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

const request = new Request('https://example.com/api/projects/project-1/unassigned-users');

function assignment(userId: string, firstName: string) {
  return {
    Id: `assignment-${userId}`,
    UserId: userId,
    FirstName: firstName,
    LastName: 'Doe',
    Email: `${userId}@example.com`,
    ResourceRoleTypeId: 'role-1',
    RoleName: 'Senior Developer',
    AssignedAt: '2026-06-18T14:11:57',
    IsActive: true,
  };
}

describe('GET /api/projects/:id/unassigned-users', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    projectsBackend.getProjectList.mockReset();
    projectsBackend.getProjectAssignments.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET(request, paramsFor('project-1'));
    expect(response.status).toBe(401);
  });

  it('allows a plain User to view candidate users (Projects is open to every authenticated role)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    projectsBackend.getProjectList.mockResolvedValue([]);
    const response = await GET(request, paramsFor('project-1'));
    expect(response.status).toBe(200);
    expect(projectsBackend.getProjectList).toHaveBeenCalled();
  });

  it('excludes users already assigned to the target project but includes users known from other projects', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    projectsBackend.getProjectList.mockResolvedValue([{ Id: 'project-1' }, { Id: 'project-2' }]);
    projectsBackend.getProjectAssignments.mockImplementation((projectId: string) => {
      if (projectId === 'project-1') return Promise.resolve([assignment('user-1', 'Alex')]);
      if (projectId === 'project-2') return Promise.resolve([assignment('user-2', 'Jane')]);
      return Promise.resolve([]);
    });

    const response = await GET(request, paramsFor('project-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.users).toEqual([
      { userId: 'user-2', firstName: 'Jane', lastName: 'Doe', email: 'user-2@example.com' },
    ]);
  });

  it('dedupes a user assigned to multiple other projects', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    projectsBackend.getProjectList.mockResolvedValue([
      { Id: 'project-1' },
      { Id: 'project-2' },
      { Id: 'project-3' },
    ]);
    projectsBackend.getProjectAssignments.mockImplementation((projectId: string) => {
      if (projectId === 'project-1') return Promise.resolve([]);
      return Promise.resolve([assignment('user-2', 'Jane')]);
    });

    const response = await GET(request, paramsFor('project-1'));
    const body = await response.json();

    expect(body.users).toHaveLength(1);
    expect(body.users[0].userId).toBe('user-2');
  });

  it('returns an empty list when every known user is already assigned to this project', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    projectsBackend.getProjectList.mockResolvedValue([{ Id: 'project-1' }]);
    projectsBackend.getProjectAssignments.mockResolvedValue([assignment('user-1', 'Alex')]);

    const response = await GET(request, paramsFor('project-1'));
    const body = await response.json();

    expect(body.users).toEqual([]);
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    projectsBackend.getProjectList.mockRejectedValue(new Error('network down'));

    const response = await GET(request, paramsFor('project-1'));
    expect(response.status).toBe(500);
  });
});
