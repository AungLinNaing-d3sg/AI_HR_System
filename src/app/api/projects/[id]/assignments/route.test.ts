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
  getProjectAssignments: jest.fn(),
  assignResource: jest.fn(),
}));

const projectsBackend = jest.requireMock('../../../../../lib/api/projectsBackend.api') as {
  getProjectAssignments: jest.Mock;
  assignResource: jest.Mock;
};

import { GET, POST } from './route';

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

function jsonRequest(body?: unknown): Request {
  return new Request('https://example.com/api/projects/project-1/assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const assignmentDto = {
  Id: 'assignment-1',
  UserId: 'user-1',
  FirstName: 'Alex',
  LastName: 'Kumar',
  Email: 'alex.kumar@example.com',
  ResourceRoleTypeId: 'role-1',
  RoleName: 'Senior Developer',
  AssignedAt: '2026-06-18T14:11:57',
  IsActive: true,
};

// These route handlers intentionally exercise a failure path that calls
// `logger.error` (see lib/utils/logger.ts), which forwards to the real
// console. Silence it here so the negative-path test run stays noise-free,
// without masking genuinely unexpected console output.
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/projects/:id/assignments', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    projectsBackend.getProjectAssignments.mockReset();
    projectsBackend.assignResource.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET(jsonRequest(), paramsFor('project-1'));
    expect(response.status).toBe(401);
  });

  it('allows a plain User to view assignments (Projects is open to every authenticated role)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    projectsBackend.getProjectAssignments.mockResolvedValue([assignmentDto]);
    const response = await GET(jsonRequest(), paramsFor('project-1'));
    expect(response.status).toBe(200);
    expect(projectsBackend.getProjectAssignments).toHaveBeenCalled();
  });

  it('returns the mapped assignment list for a ProjectAdmin', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );
    projectsBackend.getProjectAssignments.mockResolvedValue([assignmentDto]);

    const response = await GET(jsonRequest(), paramsFor('project-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.assignments).toEqual([
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
    ]);
  });
});

describe('POST /api/projects/:id/assignments', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    projectsBackend.getProjectAssignments.mockReset();
    projectsBackend.assignResource.mockReset();
  });

  it('returns 400 when the payload fails validation', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    const response = await POST(jsonRequest({ userId: '', resourceRoleTypeId: '' }), paramsFor('project-1'));
    expect(response.status).toBe(400);
    expect(projectsBackend.assignResource).not.toHaveBeenCalled();
  });

  it('assigns the resource and returns the refreshed assignment list', async () => {
    const token = tokenFor('SystemAdmin');
    mockCookieStore.get.mockImplementation((name: string) => (name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined));
    projectsBackend.assignResource.mockResolvedValue({
      Id: 'assignment-1',
      ProjectId: 'project-1',
      UserId: 'user-1',
      ResourceRoleTypeId: 'role-1',
      AssignedAt: '2026-06-18T14:11:57',
    });
    projectsBackend.getProjectAssignments.mockResolvedValue([assignmentDto]);

    const response = await POST(
      jsonRequest({ userId: 'user-1', resourceRoleTypeId: 'role-1' }),
      paramsFor('project-1')
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(projectsBackend.assignResource).toHaveBeenCalledWith(
      'project-1',
      { UserId: 'user-1', ResourceRoleTypeId: 'role-1' },
      token
    );
    expect(body.assignments).toHaveLength(1);
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    projectsBackend.assignResource.mockRejectedValue(new Error('user already assigned'));

    const response = await POST(
      jsonRequest({ userId: 'user-1', resourceRoleTypeId: 'role-1' }),
      paramsFor('project-1')
    );
    expect(response.status).toBe(500);
  });
});
