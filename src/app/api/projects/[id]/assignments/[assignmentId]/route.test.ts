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

jest.mock('../../../../../../lib/api/projectsBackend.api', () => ({
  removeResource: jest.fn(),
}));

const projectsBackend = jest.requireMock('../../../../../../lib/api/projectsBackend.api') as {
  removeResource: jest.Mock;
};

import { DELETE } from './route';

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

function tokenFor(role: string): string {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ role, exp: futureExp });
}

function paramsFor(id: string, assignmentId: string) {
  return { params: Promise.resolve({ id, assignmentId }) };
}

const request = new Request('https://example.com/api/projects/project-1/assignments/assignment-1', {
  method: 'DELETE',
});

describe('DELETE /api/projects/:id/assignments/:assignmentId', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    projectsBackend.removeResource.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await DELETE(request, paramsFor('project-1', 'assignment-1'));
    expect(response.status).toBe(401);
    expect(projectsBackend.removeResource).not.toHaveBeenCalled();
  });

  it('allows a plain User to remove an assignment (Projects is open to every authenticated role)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    projectsBackend.removeResource.mockResolvedValue(undefined);
    const response = await DELETE(request, paramsFor('project-1', 'assignment-1'));
    expect(response.status).toBe(200);
    expect(projectsBackend.removeResource).toHaveBeenCalled();
  });

  it('removes the assignment for a ProjectAdmin', async () => {
    const token = tokenFor('ProjectAdmin');
    mockCookieStore.get.mockImplementation((name: string) => (name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined));
    projectsBackend.removeResource.mockResolvedValue(undefined);

    const response = await DELETE(request, paramsFor('project-1', 'assignment-1'));

    expect(response.status).toBe(200);
    expect(projectsBackend.removeResource).toHaveBeenCalledWith('project-1', 'assignment-1', token);
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    projectsBackend.removeResource.mockRejectedValue(new Error('assignment not found'));

    const response = await DELETE(request, paramsFor('project-1', 'assignment-1'));
    expect(response.status).toBe(500);
  });
});
