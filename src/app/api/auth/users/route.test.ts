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

jest.mock('../../../../lib/api/authBackend.api', () => ({
  createUser: jest.fn(),
  getUserList: jest.fn(),
}));

const authBackend = jest.requireMock('../../../../lib/api/authBackend.api') as {
  createUser: jest.Mock;
  getUserList: jest.Mock;
};

import { GET, POST } from './route';

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
  roleId: '11111111-1111-1111-1111-111111111101',
};

describe('GET /api/auth/users', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    authBackend.getUserList.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(authBackend.getUserList).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller is not a SystemAdmin', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeToken({ role: 'ProjectAdmin', exp: futureExp });
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );

    const response = await GET();
    expect(response.status).toBe(403);
    expect(authBackend.getUserList).not.toHaveBeenCalled();
  });

  it('returns every user, requesting the large management page size', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeToken({ role: 'SystemAdmin', exp: futureExp });
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    authBackend.getUserList.mockResolvedValue({
      TotalCount: 1,
      PageNo: 1,
      PageSize: 100,
      Items: [
        { UserId: 'user-1', Username: 'admin', Email: 'admin@hrsystem.com', FirstName: 'System', LastName: 'Admin', EmployeeId: null },
      ],
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(authBackend.getUserList).toHaveBeenCalledWith(token, { pageNo: 1, pageSize: 100 });
    expect(body.totalCount).toBe(1);
    expect(body.users).toEqual([
      { userId: 'user-1', firstName: 'System', lastName: 'Admin', email: 'admin@hrsystem.com' },
    ]);
  });

  it('returns an empty list when there are no users', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeToken({ role: 'SystemAdmin', exp: futureExp });
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    authBackend.getUserList.mockResolvedValue({ TotalCount: 0, PageNo: 1, PageSize: 100, Items: [] });

    const response = await GET();
    const body = await response.json();

    expect(body.users).toEqual([]);
    expect(body.totalCount).toBe(0);
  });

  it('returns a normalized error when the backend call fails', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeToken({ role: 'SystemAdmin', exp: futureExp });
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    authBackend.getUserList.mockRejectedValue(new Error('network down'));

    const response = await GET();
    expect(response.status).toBe(500);
  });
});

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
      UserId: 'user-2',
      Username: 'jdoe',
      Email: 'jdoe@example.com',
      FirstName: 'Jane',
      LastName: 'Doe',
      EmployeeId: null,
    });

    const response = await POST(jsonRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.user.id).toBe('user-2');
    expect(body.user.username).toBe('jdoe');
    expect(body.user).not.toHaveProperty('role');
    expect(authBackend.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ Username: 'jdoe', RoleId: '11111111-1111-1111-1111-111111111101' }),
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

  it('surfaces the backend’s real validation message instead of crashing when the backend rejects a duplicate username (IsSuccess: false)', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeToken({ role: 'SystemAdmin', exp: futureExp });
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    // Mirrors what backendClient's response interceptor throws when the backend
    // responds 200 with {IsSuccess: false} - see lib/api/backendClient.ts.
    authBackend.createUser.mockRejectedValue(
      new AxiosError(
        'Username is already taken.',
        AxiosError.ERR_BAD_RESPONSE,
        undefined,
        undefined,
        {
          status: 400,
          statusText: 'Bad Request',
          headers: {},
          config: {} as never,
          data: { StatusCode: 400, IsSuccess: false, Message: 'Username is already taken.', Data: null },
        }
      )
    );

    const response = await POST(jsonRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe('Username is already taken.');
  });

  it('surfaces ASP.NET Core\'s raw model-binding error instead of a generic message (e.g. a GUID field the backend rejects for a reason our own validation didn\'t catch)', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeToken({ role: 'SystemAdmin', exp: futureExp });
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    // A malformed GUID never reaches the app's own {IsSuccess,...} envelope -
    // it fails JSON model binding first and comes back as ASP.NET's default
    // ProblemDetails shape instead (lowercase `errors`, no `Message`/`Data`).
    authBackend.createUser.mockRejectedValue(
      new AxiosError('Request failed with status code 400', AxiosError.ERR_BAD_REQUEST, undefined, undefined, {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as never,
        data: {
          title: 'One or more validation errors occurred.',
          status: 400,
          errors: {
            RoleId: [
              'The JSON value could not be converted to System.Guid. Path: $.RoleId | LineNumber: 0 | BytePositionInLine: 171.',
            ],
          },
        },
      })
    );

    const response = await POST(jsonRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe(
      'The JSON value could not be converted to System.Guid. Path: $.RoleId | LineNumber: 0 | BytePositionInLine: 171.'
    );
  });
});
