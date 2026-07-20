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

jest.mock('../../../../../lib/api/timesheetsBackend.api', () => ({
  deleteTimesheetPeriod: jest.fn(),
}));

const timesheetsBackend = jest.requireMock('../../../../../lib/api/timesheetsBackend.api') as {
  deleteTimesheetPeriod: jest.Mock;
};

import { DELETE } from './route';

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

const request = new Request('https://example.com/api/timesheets/periods/period-1', { method: 'DELETE' });

describe('DELETE /api/timesheets/periods/:id', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    timesheetsBackend.deleteTimesheetPeriod.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await DELETE(request, paramsFor('period-1'));
    expect(response.status).toBe(401);
    expect(timesheetsBackend.deleteTimesheetPeriod).not.toHaveBeenCalled();
  });

  it('returns 403 for a plain User', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    const response = await DELETE(request, paramsFor('period-1'));
    expect(response.status).toBe(403);
    expect(timesheetsBackend.deleteTimesheetPeriod).not.toHaveBeenCalled();
  });

  it('deletes the period for a SystemAdmin', async () => {
    const token = tokenFor('SystemAdmin');
    mockCookieStore.get.mockImplementation((name: string) => (name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined));
    timesheetsBackend.deleteTimesheetPeriod.mockResolvedValue(undefined);

    const response = await DELETE(request, paramsFor('period-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(timesheetsBackend.deleteTimesheetPeriod).toHaveBeenCalledWith('period-1', token);
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );
    timesheetsBackend.deleteTimesheetPeriod.mockRejectedValue(new Error('period has entries'));

    const response = await DELETE(request, paramsFor('period-1'));
    expect(response.status).toBe(500);
  });
});
