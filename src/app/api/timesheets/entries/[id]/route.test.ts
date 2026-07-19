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
  updateTimesheetEntry: jest.fn(),
}));

const timesheetsBackend = jest.requireMock('../../../../../lib/api/timesheetsBackend.api') as {
  updateTimesheetEntry: jest.Mock;
};

import { PUT } from './route';

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

function tokenFor(): string {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ sub: 'user-1', role: 'User', exp: futureExp });
}

function jsonRequest(body: unknown): Request {
  return new Request('https://example.com/api/timesheets/entries/entry-1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

const validPayload = { hours: 4, taskDescription: 'Updated notes' };

describe('PUT /api/timesheets/entries/:id', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    timesheetsBackend.updateTimesheetEntry.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await PUT(jsonRequest(validPayload), paramsFor('entry-1'));
    expect(response.status).toBe(401);
    expect(timesheetsBackend.updateTimesheetEntry).not.toHaveBeenCalled();
  });

  it('returns 400 when the payload fails validation', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor() } : undefined
    );

    const response = await PUT(jsonRequest({ hours: -5, taskDescription: '' }), paramsFor('entry-1'));
    expect(response.status).toBe(400);
    expect(timesheetsBackend.updateTimesheetEntry).not.toHaveBeenCalled();
  });

  it('updates the entry with a valid payload', async () => {
    const token = tokenFor();
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    // The real backend returns `Data: null` on success (see UpdateTimesheetEntryResponse
    // in api.types.ts) - the route must not crash trying to read entry fields off that.
    timesheetsBackend.updateTimesheetEntry.mockResolvedValue(undefined);

    const response = await PUT(jsonRequest(validPayload), paramsFor('entry-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.entry).toEqual({ id: 'entry-1', hours: 4, taskDescription: 'Updated notes' });
    expect(timesheetsBackend.updateTimesheetEntry).toHaveBeenCalledWith(
      'entry-1',
      { Hours: 4, TaskDescription: 'Updated notes' },
      token
    );
  });

  it('returns a normalized error when the backend rejects a locked entry', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor() } : undefined
    );
    timesheetsBackend.updateTimesheetEntry.mockRejectedValue(new Error('entry is approved'));

    const response = await PUT(jsonRequest(validPayload), paramsFor('entry-1'));
    expect(response.status).toBe(500);
  });
});
