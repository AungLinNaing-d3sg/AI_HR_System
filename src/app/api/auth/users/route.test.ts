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

jest.mock('../../../../lib/api/authBackend.api', () => ({
  createUser: jest.fn(),
}));

const authBackend = jest.requireMock('../../../../lib/api/authBackend.api') as { createUser: jest.Mock };

import { POST } from './route';

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

function jsonRequest(body: unknown): Request {
  return new Request('https://example.com/api/auth/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  username: 'jdoe',
  email: 'jdoe@example.com',
  password: 'Password@123',
  firstName: 'Jane',
  lastName: 'Doe',
  roleId: 'role-1',
};

describe('POST /api/auth/users', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    authBackend.createUser.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await POST(jsonRequest(validPayload));
    expect(response.status).toBe(401);
    expect(authBackend.createUser).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller is not a SystemAdmin', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeToken({ role: 'ProjectAdmin', exp: futureExp });
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );

    const response = await POST(jsonRequest(validPayload));
    expect(response.status).toBe(403);
    expect(authBackend.createUser).not.toHaveBeenCalled();
  });

  it('creates the user when the caller is a SystemAdmin with a valid payload', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeToken({ role: 'SystemAdmin', exp: futureExp });
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    authBackend.createUser.mockResolvedValue({
      Id: 'user-2',
      Username: 'jdoe',
      Email: 'jdoe@example.com',
      FirstName: 'Jane',
      LastName: 'Doe',
      EmployeeId: null,
      CountryId: null,
      RoleId: 'role-1',
      RoleName: 'User',
    });

    const response = await POST(jsonRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.user.username).toBe('jdoe');
    expect(authBackend.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ Username: 'jdoe', RoleId: 'role-1' }),
      token
    );
  });

  it('returns 400 when the payload fails validation', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeToken({ role: 'SystemAdmin', exp: futureExp });
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );

    const response = await POST(jsonRequest({ ...validPayload, roleId: '' }));
    expect(response.status).toBe(400);
    expect(authBackend.createUser).not.toHaveBeenCalled();
  });
});
