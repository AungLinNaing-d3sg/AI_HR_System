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

jest.mock('../../../../lib/api/resourceRoleTypesBackend.api', () => ({
  updateResourceRoleType: jest.fn(),
  deleteResourceRoleType: jest.fn(),
}));

const resourceRoleTypesBackend = jest.requireMock('../../../../lib/api/resourceRoleTypesBackend.api') as {
  updateResourceRoleType: jest.Mock;
  deleteResourceRoleType: jest.Mock;
};

import { PUT, DELETE } from './route';

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

function tokenFor(role: string): string {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ role, exp: futureExp });
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(body: unknown): Request {
  return new Request('https://example.com/api/resource-role-types/role-1', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

const roleTypeDto = {
  Id: '33f724ff-c089-4691-8fe1-5d3ecc41ba1b',
  Name: 'Senior Software Engineer',
  Description: 'Senior full-stack software engineer role',
};

describe('PUT /api/resource-role-types/:id', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    resourceRoleTypesBackend.updateResourceRoleType.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await PUT(makeRequest({}), makeParams('role-1'));
    expect(response.status).toBe(401);
    expect(resourceRoleTypesBackend.updateResourceRoleType).not.toHaveBeenCalled();
  });

  it('returns 403 when a non-SystemAdmin tries to update a resource role type', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );

    const response = await PUT(
      makeRequest({ name: 'Senior Software Engineer', description: '' }),
      makeParams('role-1')
    );

    expect(response.status).toBe(403);
    expect(resourceRoleTypesBackend.updateResourceRoleType).not.toHaveBeenCalled();
  });

  it('returns 400 when the payload fails validation', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );

    const response = await PUT(makeRequest({ name: '' }), makeParams('role-1'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors).toBeDefined();
    expect(resourceRoleTypesBackend.updateResourceRoleType).not.toHaveBeenCalled();
  });

  it('updates the resource role type and returns 200 with the normalized role type', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    resourceRoleTypesBackend.updateResourceRoleType.mockResolvedValue(roleTypeDto);

    const response = await PUT(
      makeRequest({ name: 'Senior Software Engineer', description: 'Senior full-stack software engineer role' }),
      makeParams('role-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.roleType.name).toBe('Senior Software Engineer');
    expect(resourceRoleTypesBackend.updateResourceRoleType).toHaveBeenCalledWith(
      'role-1',
      { Name: 'Senior Software Engineer', Description: 'Senior full-stack software engineer role' },
      expect.any(String)
    );
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    resourceRoleTypesBackend.updateResourceRoleType.mockRejectedValue(new Error('network down'));

    const response = await PUT(
      makeRequest({ name: 'Senior Software Engineer' }),
      makeParams('role-1')
    );
    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/resource-role-types/:id', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    resourceRoleTypesBackend.deleteResourceRoleType.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await DELETE(
      new Request('https://example.com/api/resource-role-types/role-1'),
      makeParams('role-1')
    );
    expect(response.status).toBe(401);
    expect(resourceRoleTypesBackend.deleteResourceRoleType).not.toHaveBeenCalled();
  });

  it('returns 403 when a non-SystemAdmin tries to delete a resource role type', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );

    const response = await DELETE(
      new Request('https://example.com/api/resource-role-types/role-1'),
      makeParams('role-1')
    );

    expect(response.status).toBe(403);
    expect(resourceRoleTypesBackend.deleteResourceRoleType).not.toHaveBeenCalled();
  });

  it('deletes the resource role type and returns 200', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    resourceRoleTypesBackend.deleteResourceRoleType.mockResolvedValue(undefined);

    const response = await DELETE(
      new Request('https://example.com/api/resource-role-types/role-1'),
      makeParams('role-1')
    );
    expect(response.status).toBe(200);
    expect(resourceRoleTypesBackend.deleteResourceRoleType).toHaveBeenCalledWith('role-1', expect.any(String));
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    resourceRoleTypesBackend.deleteResourceRoleType.mockRejectedValue(new Error('network down'));

    const response = await DELETE(
      new Request('https://example.com/api/resource-role-types/role-1'),
      makeParams('role-1')
    );
    expect(response.status).toBe(500);
  });
});
