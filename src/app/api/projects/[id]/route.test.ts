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
  getProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
}));

const projectsBackend = jest.requireMock('../../../../lib/api/projectsBackend.api') as {
  getProject: jest.Mock;
  updateProject: jest.Mock;
  deleteProject: jest.Mock;
};

import { DELETE, GET, PUT } from './route';

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

function tokenFor(role: string): string {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ role, exp: futureExp });
}

function jsonRequest(method: string, body?: unknown): Request {
  return new Request('https://example.com/api/projects/project-1', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
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

// These route handlers intentionally exercise failure paths that call
// `logger.error` (see lib/utils/logger.ts), which forwards to the real
// console. Silence it here so negative-path test runs stay noise-free,
// without masking genuinely unexpected console output.
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/projects/:id', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    projectsBackend.getProject.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET(jsonRequest('GET'), makeParams('project-1'));
    expect(response.status).toBe(401);
  });

  it('allows a plain User to view the project (Projects is open to every authenticated role)', async () => {
    const token = tokenFor('User');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.getProject.mockResolvedValue(dto);
    const response = await GET(jsonRequest('GET'), makeParams('project-1'));
    expect(response.status).toBe(200);
  });

  it('returns the mapped project for an authorized caller', async () => {
    const token = tokenFor('SystemAdmin');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.getProject.mockResolvedValue(dto);

    const response = await GET(jsonRequest('GET'), makeParams('project-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.project.id).toBe('project-1');
    expect(projectsBackend.getProject).toHaveBeenCalledWith('project-1', token);
  });

  it('returns a normalized error when the project is not found', async () => {
    const token = tokenFor('ProjectAdmin');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.getProject.mockRejectedValue(new Error('not found'));

    const response = await GET(jsonRequest('GET'), makeParams('missing-id'));
    expect(response.status).toBe(500);
  });
});

describe('PUT /api/projects/:id', () => {
  const validPayload = { code: 'PRJ-001', name: 'Updated Project Name', isActive: true };

  beforeEach(() => {
    mockCookieStore.get.mockReset();
    projectsBackend.updateProject.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await PUT(jsonRequest('PUT', validPayload), makeParams('project-1'));
    expect(response.status).toBe(401);
    expect(projectsBackend.updateProject).not.toHaveBeenCalled();
  });

  it('allows a Guest to update the project (Projects is open to every authenticated role)', async () => {
    const token = tokenFor('Guest');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.updateProject.mockResolvedValue(dto);
    const response = await PUT(jsonRequest('PUT', validPayload), makeParams('project-1'));
    expect(response.status).toBe(200);
    expect(projectsBackend.updateProject).toHaveBeenCalled();
  });

  it('returns 400 when the payload fails validation', async () => {
    const token = tokenFor('SystemAdmin');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    const response = await PUT(
      jsonRequest('PUT', { ...validPayload, isActive: 'yes' }),
      makeParams('project-1')
    );
    expect(response.status).toBe(400);
    expect(projectsBackend.updateProject).not.toHaveBeenCalled();
  });

  it('updates the project when the caller is authorized with a valid payload', async () => {
    const token = tokenFor('ProjectAdmin');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.updateProject.mockResolvedValue({ ...dto, Name: 'Updated Project Name' });

    const response = await PUT(jsonRequest('PUT', validPayload), makeParams('project-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.project.name).toBe('Updated Project Name');
    expect(projectsBackend.updateProject).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({ Code: 'PRJ-001', Name: 'Updated Project Name', IsActive: true }),
      token
    );
  });

  it('returns a normalized error when the backend call fails', async () => {
    const token = tokenFor('SystemAdmin');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.updateProject.mockRejectedValue(new Error('network down'));

    const response = await PUT(jsonRequest('PUT', validPayload), makeParams('project-1'));
    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/projects/:id', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    projectsBackend.deleteProject.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await DELETE(jsonRequest('DELETE'), makeParams('project-1'));
    expect(response.status).toBe(401);
    expect(projectsBackend.deleteProject).not.toHaveBeenCalled();
  });

  it('allows a plain User to delete the project (Projects is open to every authenticated role)', async () => {
    const token = tokenFor('User');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.deleteProject.mockResolvedValue(undefined);
    const response = await DELETE(jsonRequest('DELETE'), makeParams('project-1'));
    expect(response.status).toBe(200);
    expect(projectsBackend.deleteProject).toHaveBeenCalled();
  });

  it('deletes the project when the caller is authorized', async () => {
    const token = tokenFor('SystemAdmin');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.deleteProject.mockResolvedValue(undefined);

    const response = await DELETE(jsonRequest('DELETE'), makeParams('project-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(projectsBackend.deleteProject).toHaveBeenCalledWith('project-1', token);
  });

  it('returns a normalized error when the backend call fails', async () => {
    const token = tokenFor('ProjectAdmin');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    projectsBackend.deleteProject.mockRejectedValue(new Error('in use'));

    const response = await DELETE(jsonRequest('DELETE'), makeParams('project-1'));
    expect(response.status).toBe(500);
  });
});
