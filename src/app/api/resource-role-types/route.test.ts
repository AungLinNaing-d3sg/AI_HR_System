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
  createResourceRoleType: jest.fn(),
}));

const resourceRoleTypesBackend = jest.requireMock('../../../lib/api/resourceRoleTypesBackend.api') as {
  getAllResourceRoleTypes: jest.Mock;
  createResourceRoleType: jest.Mock;
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

function makeRequest(body: unknown): Request {
  return new Request('https://example.com/api/resource-role-types', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function makeGetRequest(query = ''): Request {
  return new Request(`https://example.com/api/resource-role-types${query}`);
}

describe('GET /api/resource-role-types', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    resourceRoleTypesBackend.getAllResourceRoleTypes.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET(makeGetRequest());
    expect(response.status).toBe(401);
  });

  it('allows a plain User to view role types (Projects is open to every authenticated role)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    resourceRoleTypesBackend.getAllResourceRoleTypes.mockResolvedValue({ Items: [] });
    const response = await GET(makeGetRequest());
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

    const response = await GET(makeGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.roleTypes).toEqual([{ id: 'role-1', name: 'Senior Developer', description: 'Senior engineer' }]);
    expect(body.totalCount).toBe(1);
  });

  it('forwards pageNo/pageSize query params to the backend', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    resourceRoleTypesBackend.getAllResourceRoleTypes.mockResolvedValue({
      Items: [],
      TotalCount: 0,
      Page: 2,
      PageSize: 5,
    });

    await GET(makeGetRequest('?pageNo=2&pageSize=5'));

    expect(resourceRoleTypesBackend.getAllResourceRoleTypes).toHaveBeenCalledWith(expect.any(String), {
      page: 2,
      pageSize: 5,
    });
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    resourceRoleTypesBackend.getAllResourceRoleTypes.mockRejectedValue(new Error('network down'));

    const response = await GET(makeGetRequest());
    expect(response.status).toBe(500);
  });
});

describe('POST /api/resource-role-types', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    resourceRoleTypesBackend.createResourceRoleType.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(401);
    expect(resourceRoleTypesBackend.createResourceRoleType).not.toHaveBeenCalled();
  });

  it('returns 403 when a non-SystemAdmin tries to create a resource role type', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );

    const response = await POST(makeRequest({ name: 'Software Engineer', description: '' }));

    expect(response.status).toBe(403);
    expect(resourceRoleTypesBackend.createResourceRoleType).not.toHaveBeenCalled();
  });

  it('returns 400 when the payload fails validation', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );

    const response = await POST(makeRequest({ name: '' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors).toBeDefined();
    expect(resourceRoleTypesBackend.createResourceRoleType).not.toHaveBeenCalled();
  });

  it('creates the resource role type and returns 201 with the normalized role type', async () => {
    const token = tokenFor('SystemAdmin');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    resourceRoleTypesBackend.createResourceRoleType.mockResolvedValue({
      Id: '33f724ff-c089-4691-8fe1-5d3ecc41ba1b',
      Name: 'Software Engineer',
      Description: 'Full-stack software engineer role',
    });

    const response = await POST(
      makeRequest({ name: 'Software Engineer', description: 'Full-stack software engineer role' })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.roleType.name).toBe('Software Engineer');
    expect(resourceRoleTypesBackend.createResourceRoleType).toHaveBeenCalledWith(
      { Name: 'Software Engineer', Description: 'Full-stack software engineer role' },
      token
    );
  });

  it('forwards a null Description when none is provided', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    resourceRoleTypesBackend.createResourceRoleType.mockResolvedValue({
      Id: '33f724ff-c089-4691-8fe1-5d3ecc41ba1b',
      Name: 'Software Engineer',
      Description: null,
    });

    await POST(makeRequest({ name: 'Software Engineer' }));

    expect(resourceRoleTypesBackend.createResourceRoleType).toHaveBeenCalledWith(
      { Name: 'Software Engineer', Description: null },
      expect.any(String)
    );
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    resourceRoleTypesBackend.createResourceRoleType.mockRejectedValue(new Error('network down'));

    const response = await POST(makeRequest({ name: 'Software Engineer' }));
    expect(response.status).toBe(500);
  });
});
