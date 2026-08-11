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
  searchUsers: jest.fn(),
}));

const authBackend = jest.requireMock('../../../../lib/api/authBackend.api') as {
  searchUsers: jest.Mock;
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

function requestWithQuery(query: string): Request {
  return new Request(`https://example.com/api/auth/search-users${query}`);
}

// This route handler intentionally exercises a failure path that calls
// `logger.error` (see lib/utils/logger.ts), which forwards to the real
// console. Silence it here so the negative-path test run stays noise-free,
// without masking genuinely unexpected console output.
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/auth/search-users', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    authBackend.searchUsers.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET(requestWithQuery('?email=jane&userName=jane'));
    expect(response.status).toBe(401);
  });

  it('allows neither email nor userName to be provided, forwarding no search params so the backend returns its broad/unfiltered list', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    authBackend.searchUsers.mockResolvedValue([]);
    const response = await GET(requestWithQuery(''));
    expect(response.status).toBe(200);
    expect(authBackend.searchUsers).toHaveBeenCalledWith({ isAllRole: false }, expect.any(String));
  });

  it('returns 400 when the search term is shorter than the minimum length', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    const response = await GET(requestWithQuery('?email=j&userName=j'));
    expect(response.status).toBe(400);
  });

  it('allows a plain User to search (Projects is open to every authenticated role)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    authBackend.searchUsers.mockResolvedValue([]);
    const response = await GET(requestWithQuery('?email=jane&userName=jane'));
    expect(response.status).toBe(200);
    expect(authBackend.searchUsers).toHaveBeenCalledWith(
      { email: 'jane', userName: 'jane', isAllRole: false },
      expect.any(String)
    );
  });

  it('sets isAllRole: false for a ProjectAdmin caller (restricted to Employee accounts, same as a plain User)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );
    authBackend.searchUsers.mockResolvedValue([]);
    await GET(requestWithQuery('?email=jane&userName=jane'));
    expect(authBackend.searchUsers).toHaveBeenCalledWith(
      { email: 'jane', userName: 'jane', isAllRole: false },
      expect.any(String)
    );
  });

  it('always sets isAllRole: false for a SystemAdmin caller too, unlike the previous role-derived behavior (this route only ever backs "Add User to Project", never the admin-only every-role search)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    authBackend.searchUsers.mockResolvedValue([]);
    await GET(requestWithQuery('?email=jane&userName=jane'));
    expect(authBackend.searchUsers).toHaveBeenCalledWith(
      { email: 'jane', userName: 'jane', isAllRole: false },
      expect.any(String)
    );
  });

  it('returns the mapped search results', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    authBackend.searchUsers.mockResolvedValue([
      {
        UserId: 'user-2',
        Username: 'jane.doe',
        Email: 'jane@example.com',
        FirstName: 'Jane',
        LastName: 'Doe',
        EmployeeId: null,
        RoleName: 'ProjectAdmin',
        IsActive: true,
      },
    ]);

    const response = await GET(requestWithQuery('?email=jane&userName=jane'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.users).toEqual([
      { userId: 'user-2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
    ]);
  });

  it('returns an empty list when no users match', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    authBackend.searchUsers.mockResolvedValue([]);

    const response = await GET(requestWithQuery('?email=zzz&userName=zzz'));
    const body = await response.json();

    expect(body.users).toEqual([]);
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    authBackend.searchUsers.mockRejectedValue(new Error('network down'));

    const response = await GET(requestWithQuery('?email=jane&userName=jane'));
    expect(response.status).toBe(500);
  });
});
