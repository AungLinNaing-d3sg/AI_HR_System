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

jest.mock('../../../lib/api/resourceRoleTypesBackend.api', () => ({
  getAllResourceRoleTypes: jest.fn(),
}));

const resourceRoleTypesBackend = jest.requireMock('../../../lib/api/resourceRoleTypesBackend.api') as {
  getAllResourceRoleTypes: jest.Mock;
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

describe('GET /api/resource-role-types', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    resourceRoleTypesBackend.getAllResourceRoleTypes.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('allows a plain User to view role types (Projects is open to every authenticated role)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    resourceRoleTypesBackend.getAllResourceRoleTypes.mockResolvedValue({ Items: [] });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(resourceRoleTypesBackend.getAllResourceRoleTypes).toHaveBeenCalled();
  });

  it('returns the mapped role type list for a SystemAdmin', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    resourceRoleTypesBackend.getAllResourceRoleTypes.mockResolvedValue({
      Items: [{ Id: 'role-1', Name: 'Senior Developer', Description: 'Senior engineer' }],
      TotalCount: 1,
      Page: 1,
      PageSize: 100,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.roleTypes).toEqual([{ id: 'role-1', name: 'Senior Developer', description: 'Senior engineer' }]);
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    resourceRoleTypesBackend.getAllResourceRoleTypes.mockRejectedValue(new Error('network down'));

    const response = await GET();
    expect(response.status).toBe(500);
  });
});
