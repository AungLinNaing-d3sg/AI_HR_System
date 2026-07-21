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
  getInvoicePdf: jest.fn(),
}));

const invoicesBackend = jest.requireMock('../../../../../lib/api/invoicesBackend.api') as {
  getInvoicePdf: jest.Mock;
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

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

const request = new Request('https://example.com/api/invoices/invoice-1/pdf');

describe('GET /api/invoices/:id/pdf', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    invoicesBackend.getInvoicePdf.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET(request, paramsFor('invoice-1'));
    expect(response.status).toBe(401);
    expect(invoicesBackend.getInvoicePdf).not.toHaveBeenCalled();
  });

  it('returns 403 for a plain User', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    const response = await GET(request, paramsFor('invoice-1'));
    expect(response.status).toBe(403);
    expect(invoicesBackend.getInvoicePdf).not.toHaveBeenCalled();
  });

  it('streams the PDF back with the backend content type and a Content-Disposition header', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    const buffer = new TextEncoder().encode('pdf-bytes').buffer as ArrayBuffer;
    invoicesBackend.getInvoicePdf.mockResolvedValue({ data: buffer, contentType: 'application/pdf' });

    const response = await GET(request, paramsFor('invoice-1'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toContain('attachment');
    expect(response.headers.get('Content-Disposition')).toContain('.pdf');
    expect(invoicesBackend.getInvoicePdf).toHaveBeenCalledWith('invoice-1', expect.any(String));
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );
    invoicesBackend.getInvoicePdf.mockRejectedValue(new Error('invoice not found'));

    const response = await GET(request, paramsFor('invoice-1'));
    expect(response.status).toBe(500);
  });
});
