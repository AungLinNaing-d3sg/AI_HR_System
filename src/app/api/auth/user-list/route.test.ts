/**
 * @jest-environment node
 */
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { USERS_PAGE_SIZE } from '@/lib/constants/user.constants';

const mockCookieStore = {
  get: jest.fn(),
};

jest.mock('next/headers', () => ({
  cookies: () => Promise.resolve(mockCookieStore),
}));

jest.mock('../../../../lib/api/authBackend.api', () => ({
  getUserList: jest.fn(),
}));

const authBackend = jest.requireMock('../../../../lib/api/authBackend.api') as {
  getUserList: jest.Mock;
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

function pageOf(items: unknown[]) {
  return { TotalCount: items.length, PageNo: 1, PageSize: USERS_PAGE_SIZE, Items: items };
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

describe('GET /api/auth/user-list', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    authBackend.getUserList.mockReset();
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
    authBackend.getUserList.mockResolvedValue(pageOf([]));
    const response = await GET();
    expect(response.status).toBe(200);
    expect(authBackend.getUserList).toHaveBeenCalledWith(expect.any(String), {
      pageNo: 1,
      pageSize: USERS_PAGE_SIZE,
    });
  });

  it('returns the mapped user list, up to USERS_PAGE_SIZE candidates, so the combobox can show every user up front', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    authBackend.getUserList.mockResolvedValue(
      pageOf([{ UserId: 'user-2', Username: 'jane.doe', Email: 'jane@example.com', FirstName: 'Jane', LastName: 'Doe', EmployeeId: null }])
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.users).toEqual([
      { userId: 'user-2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
    ]);
  });

  it('returns an empty list when the user list has no items', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    authBackend.getUserList.mockResolvedValue(pageOf([]));

    const response = await GET();
    const body = await response.json();

    expect(body.users).toEqual([]);
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    authBackend.getUserList.mockRejectedValue(new Error('network down'));

    const response = await GET();
    expect(response.status).toBe(500);
  });
});
