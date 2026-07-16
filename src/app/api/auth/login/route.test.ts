/**
 * @jest-environment node
 */
jest.mock('../../../../lib/api/authBackend.api', () => ({
  login: jest.fn(),
}));

const authBackend = jest.requireMock('../../../../lib/api/authBackend.api') as { login: jest.Mock };

import { POST } from './route';

function jsonRequest(body: unknown): Request {
  return new Request('https://example.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    authBackend.login.mockReset();
  });

  it('rejects an invalid payload before calling the backend', async () => {
    const response = await POST(jsonRequest({ usernameOrEmail: '', password: '' }));
    expect(response.status).toBe(400);
    expect(authBackend.login).not.toHaveBeenCalled();
  });

  it('sets httpOnly cookies and returns only the mapped user on success', async () => {
    authBackend.login.mockResolvedValue({
      AccessToken: 'access-token',
      RefreshToken: 'refresh-token',
      ExpiresIn: 900,
      User: {
        Id: 'user-1',
        Username: 'jdoe',
        Email: 'jdoe@example.com',
        FirstName: 'Jane',
        LastName: 'Doe',
        EmployeeId: null,
        CountryId: null,
        RoleId: 'role-1',
        RoleName: 'User',
      },
    });

    const response = await POST(jsonRequest({ usernameOrEmail: 'jdoe', password: 'Password@123' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user).toEqual({
      id: 'user-1',
      username: 'jdoe',
      email: 'jdoe@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      employeeId: null,
      countryId: null,
      role: 'User',
    });
    expect(body.user.accessToken).toBeUndefined();

    const setCookie = response.headers.getSetCookie().join(';');
    expect(setCookie).toContain('access-token');
    expect(setCookie).toContain('HttpOnly');
  });

  it('returns 401 with the backend message when credentials are rejected', async () => {
    const { AxiosError, AxiosHeaders } = await import('axios');
    authBackend.login.mockRejectedValue(
      new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 401,
        statusText: '',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
        data: { Message: 'Invalid username/email or password.' },
      })
    );

    const response = await POST(jsonRequest({ usernameOrEmail: 'jdoe', password: 'wrong-Password@1' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toBe('Invalid username/email or password.');
  });

  it('returns 400 for a malformed JSON body', async () => {
    const request = new Request('https://example.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json',
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
