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

jest.mock('../../../../../../lib/api/timesheetsBackend.api', () => ({
  unlockTimesheetPeriod: jest.fn(),
}));

const timesheetsBackend = jest.requireMock('../../../../../../lib/api/timesheetsBackend.api') as {
  unlockTimesheetPeriod: jest.Mock;
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

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

const request = new Request('https://example.com/api/timesheets/periods/period-1/unlock', { method: 'PUT' });

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

describe('PUT /api/timesheets/periods/:id/unlock', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    timesheetsBackend.unlockTimesheetPeriod.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await PUT(request, paramsFor('period-1'));
    expect(response.status).toBe(401);
    expect(timesheetsBackend.unlockTimesheetPeriod).not.toHaveBeenCalled();
  });

  it('returns 403 for a plain User', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    const response = await PUT(request, paramsFor('period-1'));
    expect(response.status).toBe(403);
    expect(timesheetsBackend.unlockTimesheetPeriod).not.toHaveBeenCalled();
  });

  it('unlocks the period for a SystemAdmin and returns the confirmation', async () => {
    const token = tokenFor('SystemAdmin');
    mockCookieStore.get.mockImplementation((name: string) => (name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined));
    timesheetsBackend.unlockTimesheetPeriod.mockResolvedValue(undefined);

    const response = await PUT(request, paramsFor('period-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ id: 'period-1', isLocked: false });
    expect(timesheetsBackend.unlockTimesheetPeriod).toHaveBeenCalledWith('period-1', token);
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );
    timesheetsBackend.unlockTimesheetPeriod.mockRejectedValue(new Error('period not found'));

    const response = await PUT(request, paramsFor('period-1'));
    expect(response.status).toBe(500);
  });
});
