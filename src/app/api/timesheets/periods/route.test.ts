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

jest.mock('../../../../lib/api/timesheetsBackend.api', () => ({
  getTimesheetPeriods: jest.fn(),
  createTimesheetPeriod: jest.fn(),
}));

const timesheetsBackend = jest.requireMock('../../../../lib/api/timesheetsBackend.api') as {
  getTimesheetPeriods: jest.Mock;
  createTimesheetPeriod: jest.Mock;
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

function jsonRequest(body: unknown): Request {
  return new Request('https://example.com/api/timesheets/periods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const dto = { Id: 'period-1', PeriodStart: '2026-03-01', PeriodEnd: '2026-05-15', IsLocked: false };
const validPayload = { periodStart: '2026-03-01', periodEnd: '2026-05-15' };

describe('GET /api/timesheets/periods', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    timesheetsBackend.getTimesheetPeriods.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns 403 for a plain User', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    const response = await GET();
    expect(response.status).toBe(403);
    expect(timesheetsBackend.getTimesheetPeriods).not.toHaveBeenCalled();
  });

  it('returns the mapped, newest-first period list for a SystemAdmin', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    timesheetsBackend.getTimesheetPeriods.mockResolvedValue([
      { Id: 'older', PeriodStart: '2026-01-01', PeriodEnd: '2026-01-31', IsLocked: true },
      dto,
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.periods.map((p: { id: string }) => p.id)).toEqual(['period-1', 'older']);
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    timesheetsBackend.getTimesheetPeriods.mockRejectedValue(new Error('network down'));

    const response = await GET();
    expect(response.status).toBe(500);
  });
});

describe('POST /api/timesheets/periods', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    timesheetsBackend.createTimesheetPeriod.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await POST(jsonRequest(validPayload));
    expect(response.status).toBe(401);
    expect(timesheetsBackend.createTimesheetPeriod).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller is not a SystemAdmin/ProjectAdmin', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('Guest') } : undefined
    );
    const response = await POST(jsonRequest(validPayload));
    expect(response.status).toBe(403);
    expect(timesheetsBackend.createTimesheetPeriod).not.toHaveBeenCalled();
  });

  it('returns 400 when the payload fails validation (end before start)', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    const response = await POST(jsonRequest({ periodStart: '2026-05-15', periodEnd: '2026-03-01' }));
    expect(response.status).toBe(400);
    expect(timesheetsBackend.createTimesheetPeriod).not.toHaveBeenCalled();
  });

  it('creates the period when the caller is authorized with a valid payload', async () => {
    const token = tokenFor('ProjectAdmin');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    timesheetsBackend.createTimesheetPeriod.mockResolvedValue(dto);

    const response = await POST(jsonRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.period.id).toBe('period-1');
    expect(timesheetsBackend.createTimesheetPeriod).toHaveBeenCalledWith(
      { PeriodStart: '2026-03-01', PeriodEnd: '2026-05-15' },
      token
    );
  });

  it('surfaces the backend\'s real validation message on an overlapping period (IsSuccess: false)', async () => {
    const { AxiosError } = await import('axios');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    timesheetsBackend.createTimesheetPeriod.mockRejectedValue(
      new AxiosError('Request failed', AxiosError.ERR_BAD_RESPONSE, undefined, undefined, {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as never,
        data: {
          StatusCode: 400,
          IsSuccess: false,
          Message: 'This period overlaps an existing timesheet period.',
          Data: null,
        },
      })
    );

    const response = await POST(jsonRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe('This period overlaps an existing timesheet period.');
  });
});
