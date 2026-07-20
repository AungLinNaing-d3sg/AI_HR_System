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
  getTimesheetEntryById: jest.fn(),
  deleteTimesheetEntry: jest.fn(),
}));

const timesheetsBackend = jest.requireMock('../../../../../lib/api/timesheetsBackend.api') as {
  updateTimesheetEntry: jest.Mock;
  getTimesheetEntryById: jest.Mock;
  deleteTimesheetEntry: jest.Mock;
};

import { DELETE, PUT } from './route';

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

function tokenFor(role = 'User', sub = 'user-1'): string {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ sub, role, exp: futureExp });
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

const deleteRequest = new Request('https://example.com/api/timesheets/entries/entry-1', { method: 'DELETE' });

function ownedEntry(overrides: Record<string, unknown> = {}) {
  return {
    Id: 'entry-1',
    UserId: 'user-1',
    ProjectId: 'project-1',
    TimesheetPeriodId: 'period-1',
    EntryDate: '2025-02-24',
    Hours: 6,
    TaskDescription: 'Frontend component development',
    IsApproved: false,
    ...overrides,
  };
}

describe('DELETE /api/timesheets/entries/:id', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    timesheetsBackend.getTimesheetEntryById.mockReset();
    timesheetsBackend.deleteTimesheetEntry.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await DELETE(deleteRequest, paramsFor('entry-1'));
    expect(response.status).toBe(401);
    expect(timesheetsBackend.getTimesheetEntryById).not.toHaveBeenCalled();
    expect(timesheetsBackend.deleteTimesheetEntry).not.toHaveBeenCalled();
  });

  it("deletes the caller's own pending entry", async () => {
    const token = tokenFor('User', 'user-1');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    timesheetsBackend.getTimesheetEntryById.mockResolvedValue(ownedEntry());
    timesheetsBackend.deleteTimesheetEntry.mockResolvedValue(undefined);

    const response = await DELETE(deleteRequest, paramsFor('entry-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(timesheetsBackend.deleteTimesheetEntry).toHaveBeenCalledWith('entry-1', token);
  });

  it("returns 403 when a plain User tries to delete someone else's entry", async () => {
    const token = tokenFor('User', 'user-1');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    timesheetsBackend.getTimesheetEntryById.mockResolvedValue(ownedEntry({ UserId: 'someone-else' }));

    const response = await DELETE(deleteRequest, paramsFor('entry-1'));
    expect(response.status).toBe(403);
    expect(timesheetsBackend.deleteTimesheetEntry).not.toHaveBeenCalled();
  });

  it("allows a ProjectAdmin to delete another user's pending entry", async () => {
    const token = tokenFor('ProjectAdmin', 'admin-1');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    timesheetsBackend.getTimesheetEntryById.mockResolvedValue(ownedEntry({ UserId: 'someone-else' }));
    timesheetsBackend.deleteTimesheetEntry.mockResolvedValue(undefined);

    const response = await DELETE(deleteRequest, paramsFor('entry-1'));
    expect(response.status).toBe(200);
    expect(timesheetsBackend.deleteTimesheetEntry).toHaveBeenCalledWith('entry-1', token);
  });

  it('returns 409 when the entry is already approved, even for the owner', async () => {
    const token = tokenFor('User', 'user-1');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    timesheetsBackend.getTimesheetEntryById.mockResolvedValue(ownedEntry({ IsApproved: true }));

    const response = await DELETE(deleteRequest, paramsFor('entry-1'));
    expect(response.status).toBe(409);
    expect(timesheetsBackend.deleteTimesheetEntry).not.toHaveBeenCalled();
  });

  it('returns a normalized error when the backend call fails', async () => {
    const token = tokenFor('User', 'user-1');
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined
    );
    timesheetsBackend.getTimesheetEntryById.mockRejectedValue(new Error('not found'));

    const response = await DELETE(deleteRequest, paramsFor('entry-1'));
    expect(response.status).toBe(500);
  });
});
