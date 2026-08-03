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

jest.mock('../../../../lib/api/projectsBackend.api', () => ({
  getMyProjectList: jest.fn(),
}));

const projectsBackend = jest.requireMock('../../../../lib/api/projectsBackend.api') as {
  getMyProjectList: jest.Mock;
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

const dto = {
  Id: 'project-1',
  Code: 'PRJ-001',
  Name: 'Sample Project',
  Description: null,
  ClientName: null,
  ClientEmail: null,
  StartDate: null,
  EndDate: null,
  MaxDailyHours: null,
  IsActive: true,
};

// This route handler intentionally exercises a failure path that calls
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

describe('GET /api/projects/mine', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    projectsBackend.getMyProjectList.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(projectsBackend.getMyProjectList).not.toHaveBeenCalled();
  });

  it('returns the mapped project list for a plain User (Employee)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('Employee') } : undefined
    );
    projectsBackend.getMyProjectList.mockResolvedValue([dto]);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(projectsBackend.getMyProjectList).toHaveBeenCalledWith(expect.any(String));
  });

  it('returns the mapped project list for a ProjectAdmin', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );
    projectsBackend.getMyProjectList.mockResolvedValue([dto]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(projectsBackend.getMyProjectList).toHaveBeenCalledWith(expect.any(String));
    expect(body.projects).toEqual([
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
    ]);
  });

  it('returns 403 for a SystemAdmin (their /projects table always uses the unscoped GetProjectList)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    const response = await GET();
    expect(response.status).toBe(403);
    expect(projectsBackend.getMyProjectList).not.toHaveBeenCalled();
  });

  it('returns 403 for a Guest (same unscoped-GetProjectList-only rule as a SystemAdmin)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('Guest') } : undefined
    );
    const response = await GET();
    expect(response.status).toBe(403);
    expect(projectsBackend.getMyProjectList).not.toHaveBeenCalled();
  });

  it('returns an empty array for a plain User (Employee) with no assigned projects', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('Employee') } : undefined
    );
    projectsBackend.getMyProjectList.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.projects).toEqual([]);
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );
    projectsBackend.getMyProjectList.mockRejectedValue(new Error('network down'));

    const response = await GET();
    expect(response.status).toBe(500);
  });
});
