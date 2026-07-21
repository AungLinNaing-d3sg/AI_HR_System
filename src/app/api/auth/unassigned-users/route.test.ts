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
  getUnassignedUsers: jest.fn(),
}));

const authBackend = jest.requireMock('../../../../lib/api/authBackend.api') as {
  getUnassignedUsers: jest.Mock;
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

describe('GET /api/auth/unassigned-users', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    authBackend.getUnassignedUsers.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('allows a plain User to view candidate users (Projects is open to every authenticated role)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    authBackend.getUnassignedUsers.mockResolvedValue([]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(authBackend.getUnassignedUsers).toHaveBeenCalled();
  });

  it('returns the mapped unassigned user list', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    authBackend.getUnassignedUsers.mockResolvedValue([
      { UserId: 'user-2', Username: 'jane.doe', Email: 'jane@example.com', FirstName: 'Jane', LastName: 'Doe', EmployeeId: null },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.users).toEqual([
      { userId: 'user-2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
    ]);
  });

  it('returns an empty list when every user is already assigned to a project', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    authBackend.getUnassignedUsers.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(body.users).toEqual([]);
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    authBackend.getUnassignedUsers.mockRejectedValue(new Error('network down'));

    const response = await GET();
    expect(response.status).toBe(500);
  });
});
