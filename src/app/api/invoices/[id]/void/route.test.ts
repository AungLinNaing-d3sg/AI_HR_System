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

jest.mock('../../../../../lib/api/invoicesBackend.api', () => ({
  voidInvoice: jest.fn(),
}));

const invoicesBackend = jest.requireMock('../../../../../lib/api/invoicesBackend.api') as {
  voidInvoice: jest.Mock;
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

const request = new Request('https://example.com/api/invoices/invoice-1/void', { method: 'PUT' });

describe('PUT /api/invoices/:id/void', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    invoicesBackend.voidInvoice.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await PUT(request, paramsFor('invoice-1'));
    expect(response.status).toBe(401);
    expect(invoicesBackend.voidInvoice).not.toHaveBeenCalled();
  });

  it('returns 403 for a plain User', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    const response = await PUT(request, paramsFor('invoice-1'));
    expect(response.status).toBe(403);
    expect(invoicesBackend.voidInvoice).not.toHaveBeenCalled();
  });

  it('voids the invoice for a SystemAdmin and returns the new status', async () => {
    const token = tokenFor('SystemAdmin');
    mockCookieStore.get.mockImplementation((name: string) => (name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined));
    invoicesBackend.voidInvoice.mockResolvedValue({ Id: 'invoice-1', Status: 'Void' });

    const response = await PUT(request, paramsFor('invoice-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ id: 'invoice-1', status: 'Void' });
    expect(invoicesBackend.voidInvoice).toHaveBeenCalledWith('invoice-1', token);
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );
    invoicesBackend.voidInvoice.mockRejectedValue(new Error('invoice not found'));

    const response = await PUT(request, paramsFor('invoice-1'));
    expect(response.status).toBe(500);
  });
});
