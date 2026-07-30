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
  createTimesheetEntry: jest.fn(),
  getTimesheetEntries: jest.fn(),
}));

const timesheetsBackend = jest.requireMock('../../../../lib/api/timesheetsBackend.api') as {
  createTimesheetEntry: jest.Mock;
  getTimesheetEntries: jest.Mock;
};

import { POST } from './route';

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

function tokenFor(role = 'User'): string {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ sub: 'user-1', role, exp: futureExp });
}

function jsonRequest(body: unknown): Request {
  return new Request('https://example.com/api/timesheets/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  projectId: 'project-1',
  timesheetPeriodId: 'period-1',
  entryDate: '2025-02-24',
  hours: 6,
  taskDescription: 'Frontend component development',
};

const dto = {
  Id: 'entry-1',
  UserId: 'user-1',
  ProjectId: 'project-1',
  TimesheetPeriodId: 'period-1',
  EntryDate: '2025-02-24',
  Hours: 6,
  TaskDescription: 'Frontend component development',
  IsApproved: false,
};

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

describe('POST /api/timesheets/entries', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    timesheetsBackend.createTimesheetEntry.mockReset();
    timesheetsBackend.getTimesheetEntries.mockReset();
    timesheetsBackend.getTimesheetEntries.mockResolvedValue([]);
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await POST(jsonRequest(validPayload));
    expect(response.status).toBe(401);
    expect(timesheetsBackend.createTimesheetEntry).not.toHaveBeenCalled();
  });

  it('returns 400 for a malformed JSON body', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor() } : undefined
    );
    const badRequest = new Request('https://example.com/api/timesheets/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not valid json',
    });

    const response = await POST(badRequest);
    expect(response.status).toBe(400);
  });

  it('returns 400 when the payload fails validation', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor() } : undefined
    );

    const response = await POST(jsonRequest({ ...validPayload, projectId: '' }));
    expect(response.status).toBe(400);
    expect(timesheetsBackend.createTimesheetEntry).not.toHaveBeenCalled();
  });

  it('creates the entry for any authenticated role with a valid payload', async () => {
    const token = tokenFor('User');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    timesheetsBackend.createTimesheetEntry.mockResolvedValue(dto);

    const response = await POST(jsonRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.entry.hours).toBe(6);
    expect(timesheetsBackend.getTimesheetEntries).toHaveBeenCalledWith(token, {
      userId: 'user-1',
      projectId: 'project-1',
    });
    expect(timesheetsBackend.createTimesheetEntry).toHaveBeenCalledWith(
      {
        ProjectId: 'project-1',
        TimesheetPeriodId: 'period-1',
        EntryDate: '2025-02-24',
        Hours: 6,
        TaskDescription: 'Frontend component development',
      },
      token
    );
  });

  it('returns 409 when the user already has an entry for this project on this day', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor() } : undefined
    );
    timesheetsBackend.getTimesheetEntries.mockResolvedValue([{ ...dto, EntryDate: '2025-02-24' }]);

    const response = await POST(jsonRequest(validPayload));
    expect(response.status).toBe(409);
    expect(timesheetsBackend.createTimesheetEntry).not.toHaveBeenCalled();
  });

  it('allows creating an entry for the same project on a different day', async () => {
    const token = tokenFor('User');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    timesheetsBackend.getTimesheetEntries.mockResolvedValue([{ ...dto, EntryDate: '2025-02-25' }]);
    timesheetsBackend.createTimesheetEntry.mockResolvedValue(dto);

    const response = await POST(jsonRequest(validPayload));
    expect(response.status).toBe(201);
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor() } : undefined
    );
    timesheetsBackend.createTimesheetEntry.mockRejectedValue(new Error('network down'));

    const response = await POST(jsonRequest(validPayload));
    expect(response.status).toBe(500);
  });
});
