/**
 * @jest-environment node
 */
import { AxiosError } from 'axios';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';

const mockCookieStore = {
  get: jest.fn(),
};

jest.mock('next/headers', () => ({
  cookies: () => Promise.resolve(mockCookieStore),
}));

jest.mock('../../../../../lib/api/authBackend.api', () => ({
  updateUser: jest.fn(),
}));

const authBackend = jest.requireMock('../../../../../lib/api/authBackend.api') as {
  updateUser: jest.Mock;
};

import { PUT } from './route';

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
  return new Request('https://example.com/api/auth/users/user-2', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  username: 'testedited',
  email: 'test@d3-sg.com',
  firstName: 'Lin Thit',
  lastName: 'Htoo',
  employeeId: 'EMP002',
  countryId: '22222222-2222-2222-2222-222222222201',
  isActive: true,
  roleId: '',
};

const updateUserResponseDto = {
  UserId: 'user-2',
  Username: 'testedited',
  Email: 'test@d3-sg.com',
  FirstName: 'Lin Thit',
  LastName: 'Htoo',
  EmployeeId: 'EMP002',
  CountryId: '22222222-2222-2222-2222-222222222201',
  IsActive: true,
  RoleName: 'SystemAdmin',
};

// This route handler intentionally exercises failure paths that call
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

describe('PUT /api/auth/users/:id', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    authBackend.updateUser.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await PUT(makeRequest(validPayload), makeParams('user-2'));
    expect(response.status).toBe(401);
    expect(authBackend.updateUser).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller is not a SystemAdmin', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );

    const response = await PUT(makeRequest(validPayload), makeParams('user-2'));
    expect(response.status).toBe(403);
    expect(authBackend.updateUser).not.toHaveBeenCalled();
  });

  it('returns 400 when the payload fails validation', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );

    const response = await PUT(makeRequest({ ...validPayload, email: 'not-an-email' }), makeParams('user-2'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors).toBeDefined();
    expect(authBackend.updateUser).not.toHaveBeenCalled();
  });

  it('updates the user and returns 200 with the normalized user, forwarding null for blank optional fields', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    authBackend.updateUser.mockResolvedValue(updateUserResponseDto);

    const response = await PUT(makeRequest(validPayload), makeParams('user-2'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user).toEqual({
      userId: 'user-2',
      username: 'testedited',
      firstName: 'Lin Thit',
      lastName: 'Htoo',
      email: 'test@d3-sg.com',
      employeeId: 'EMP002',
      roleName: 'SystemAdmin',
      countryId: '22222222-2222-2222-2222-222222222201',
      countryCode: null,
      countryName: null,
      isActive: true,
    });
    expect(authBackend.updateUser).toHaveBeenCalledWith(
      'user-2',
      {
        Username: 'testedited',
        Email: 'test@d3-sg.com',
        FirstName: 'Lin Thit',
        LastName: 'Htoo',
        EmployeeId: 'EMP002',
        CountryId: '22222222-2222-2222-2222-222222222201',
        IsActive: true,
        RoleId: null,
      },
      expect.any(String)
    );
  });

  it('forwards a non-empty roleId as-is, to change the account role', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    authBackend.updateUser.mockResolvedValue(updateUserResponseDto);

    await PUT(
      makeRequest({ ...validPayload, roleId: '11111111-1111-1111-1111-111111111102' }),
      makeParams('user-2')
    );

    expect(authBackend.updateUser).toHaveBeenCalledWith(
      'user-2',
      expect.objectContaining({ RoleId: '11111111-1111-1111-1111-111111111102' }),
      expect.any(String)
    );
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    authBackend.updateUser.mockRejectedValue(new Error('network down'));

    const response = await PUT(makeRequest(validPayload), makeParams('user-2'));
    expect(response.status).toBe(500);
  });

  it('surfaces the backend’s real validation message instead of crashing (e.g. a duplicate email)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    authBackend.updateUser.mockRejectedValue(
      new AxiosError('Email is already taken.', AxiosError.ERR_BAD_RESPONSE, undefined, undefined, {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as never,
        data: { StatusCode: 400, IsSuccess: false, Message: 'Email is already taken.', Data: null },
      })
    );

    const response = await PUT(makeRequest(validPayload), makeParams('user-2'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe('Email is already taken.');
  });
});
