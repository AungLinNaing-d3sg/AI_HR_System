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

jest.mock('../../../lib/api/projectsBackend.api', () => ({
  getProjectList: jest.fn(),
  createProject: jest.fn(),
}));

const projectsBackend = jest.requireMock('../../../lib/api/projectsBackend.api') as {
  getProjectList: jest.Mock;
  createProject: jest.Mock;
};

import { GET, POST } from './route';

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

function jsonRequest(body: unknown): Request {
  return new Request('https://example.com/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function tokenFor(role: string): string {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ role, exp: futureExp });
}

const validPayload = { code: 'PRJ-001', name: 'Sample Project' };

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

describe('GET /api/projects', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    projectsBackend.getProjectList.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(projectsBackend.getProjectList).not.toHaveBeenCalled();
  });

  it('allows a plain User to view the project list (Projects is open to every authenticated role)', async () => {
    const token = tokenFor('User');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.getProjectList.mockResolvedValue([dto]);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(projectsBackend.getProjectList).toHaveBeenCalled();
  });

  it('returns the mapped project list for a SystemAdmin', async () => {
    const token = tokenFor('SystemAdmin');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.getProjectList.mockResolvedValue([dto]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
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

  it('returns a normalized error when the backend call fails', async () => {
    const token = tokenFor('ProjectAdmin');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.getProjectList.mockRejectedValue(new Error('network down'));

    const response = await GET();
    expect(response.status).toBe(500);
  });
});

describe('POST /api/projects', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    projectsBackend.createProject.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await POST(jsonRequest(validPayload));
    expect(response.status).toBe(401);
    expect(projectsBackend.createProject).not.toHaveBeenCalled();
  });

  it('allows a Guest to create a project (Projects is open to every authenticated role)', async () => {
    const token = tokenFor('Guest');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.createProject.mockResolvedValue(dto);

    const response = await POST(jsonRequest(validPayload));
    expect(response.status).toBe(201);
    expect(projectsBackend.createProject).toHaveBeenCalled();
  });

  it('returns 400 when the payload fails validation', async () => {
    const token = tokenFor('ProjectAdmin');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );

    const response = await POST(jsonRequest({ ...validPayload, code: '' }));
    expect(response.status).toBe(400);
    expect(projectsBackend.createProject).not.toHaveBeenCalled();
  });

  it('creates the project when the caller is authorized with a valid payload', async () => {
    const token = tokenFor('SystemAdmin');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.createProject.mockResolvedValue(dto);

    const response = await POST(jsonRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.project.code).toBe('PRJ-001');
    expect(projectsBackend.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ Code: 'PRJ-001', Name: 'Sample Project' }),
      token
    );
  });

  it('normalizes a lowercase project code to uppercase before sending it to the backend', async () => {
    const token = tokenFor('SystemAdmin');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.createProject.mockResolvedValue(dto);

    await POST(jsonRequest({ ...validPayload, code: 'prj-002' }));
    expect(projectsBackend.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ Code: 'PRJ-002' }),
      token
    );
  });

  it('returns a normalized error when the backend call fails', async () => {
    const token = tokenFor('SystemAdmin');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.createProject.mockRejectedValue(new Error('network down'));

    const response = await POST(jsonRequest(validPayload));
    expect(response.status).toBe(500);
  });
});
