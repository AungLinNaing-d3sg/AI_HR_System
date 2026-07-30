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

jest.mock('../../../../lib/api/invoicesBackend.api', () => ({
  getInvoiceById: jest.fn(),
  updateInvoice: jest.fn(),
  deleteInvoice: jest.fn(),
}));

const invoicesBackend = jest.requireMock('../../../../lib/api/invoicesBackend.api') as {
  getInvoiceById: jest.Mock;
  updateInvoice: jest.Mock;
  deleteInvoice: jest.Mock;
};

import { DELETE, GET, PUT } from './route';

function makeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.sig`;
}

function tokenFor(role: string): string {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ role, exp: futureExp });
}

function jsonRequest(method: string, body?: unknown): Request {
  return new Request('https://example.com/api/invoices/invoice-1', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

const detailDto = {
  Id: 'invoice-1',
  InvoiceNumber: 'INV-2025-0001',
  Project: { Id: 'project-1', Code: 'PRJ-001', Name: 'Project Helix' },
  ClientName: 'TM',
  ClientEmail: 'billing@tm.com',
  BillingPeriodStart: '2025-03-01',
  BillingPeriodEnd: '2025-03-31',
  Currency: { Id: 'currency-1', Code: 'USD', Symbol: '$' },
  ExchangeRate: 1,
  SubTotal: 1800,
  TaxAmount: 0,
  TotalAmount: 1800,
  Status: 'Draft',
  IssuedDate: '2025-04-01',
  DueDate: '2025-04-10',
  Notes: 'Invoice for March services',
  LineItems: [],
  CreatedAt: '2026-06-22T12:22:44Z',
};

const validUpdatePayload = {
  currencyId: 'currency-1',
  clientName: 'TM Updated',
  clientEmail: 'billing@tm.com',
  issuedDate: '2025-04-01',
  dueDate: '2025-04-10',
  notes: 'Updated notes',
};

// These route handlers intentionally exercise failure paths that call
// `logger.error` (see lib/utils/logger.ts), which forwards to the real
// console. Silence it here so negative-path test runs stay noise-free,
// without masking genuinely unexpected console output.
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/invoices/:id', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    invoicesBackend.getInvoiceById.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET(jsonRequest('GET'), makeParams('invoice-1'));
    expect(response.status).toBe(401);
  });

  it('returns 403 for a plain User', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    const response = await GET(jsonRequest('GET'), makeParams('invoice-1'));
    expect(response.status).toBe(403);
    expect(invoicesBackend.getInvoiceById).not.toHaveBeenCalled();
  });

  it('returns the mapped invoice for an authorized caller', async () => {
    const token = tokenFor('SystemAdmin');
    mockCookieStore.get.mockImplementation((name: string) => (name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined));
    invoicesBackend.getInvoiceById.mockResolvedValue(detailDto);

    const response = await GET(jsonRequest('GET'), makeParams('invoice-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.invoice.invoiceNumber).toBe('INV-2025-0001');
    expect(invoicesBackend.getInvoiceById).toHaveBeenCalledWith('invoice-1', token);
  });

  it('returns a normalized error when the invoice is not found', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );
    invoicesBackend.getInvoiceById.mockRejectedValue(new Error('not found'));

    const response = await GET(jsonRequest('GET'), makeParams('missing-id'));
    expect(response.status).toBe(500);
  });
});

describe('PUT /api/invoices/:id', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    invoicesBackend.updateInvoice.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await PUT(jsonRequest('PUT', validUpdatePayload), makeParams('invoice-1'));
    expect(response.status).toBe(401);
    expect(invoicesBackend.updateInvoice).not.toHaveBeenCalled();
  });

  it('returns 403 for a plain User', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    const response = await PUT(jsonRequest('PUT', validUpdatePayload), makeParams('invoice-1'));
    expect(response.status).toBe(403);
    expect(invoicesBackend.updateInvoice).not.toHaveBeenCalled();
  });

  it('returns 400 when the payload fails validation', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    const response = await PUT(
      jsonRequest('PUT', { ...validUpdatePayload, clientName: '' }),
      makeParams('invoice-1')
    );
    expect(response.status).toBe(400);
    expect(invoicesBackend.updateInvoice).not.toHaveBeenCalled();
  });

  it('updates the invoice for an authorized caller with a valid payload', async () => {
    const token = tokenFor('ProjectAdmin');
    mockCookieStore.get.mockImplementation((name: string) => (name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined));
    invoicesBackend.updateInvoice.mockResolvedValue({
      Id: 'invoice-1',
      InvoiceNumber: 'INV-2025-0001',
      ClientName: 'TM Updated',
      ClientEmail: 'billing@tm.com',
      IssuedDate: '2025-04-01',
      DueDate: '2025-04-10',
      Notes: 'Updated notes',
      Status: 'Draft',
    });

    const response = await PUT(jsonRequest('PUT', validUpdatePayload), makeParams('invoice-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.invoice.clientName).toBe('TM Updated');
    expect(invoicesBackend.updateInvoice).toHaveBeenCalledWith(
      'invoice-1',
      {
        CurrencyId: 'currency-1',
        ClientName: 'TM Updated',
        ClientEmail: 'billing@tm.com',
        IssuedDate: '2025-04-01',
        DueDate: '2025-04-10',
        Notes: 'Updated notes',
      },
      token
    );
  });

  it('returns a normalized error when the backend rejects a non-Draft update', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    invoicesBackend.updateInvoice.mockRejectedValue(new Error('only Draft invoices can be updated'));

    const response = await PUT(jsonRequest('PUT', validUpdatePayload), makeParams('invoice-1'));
    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/invoices/:id', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    invoicesBackend.deleteInvoice.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await DELETE(jsonRequest('DELETE'), makeParams('invoice-1'));
    expect(response.status).toBe(401);
    expect(invoicesBackend.deleteInvoice).not.toHaveBeenCalled();
  });

  it('returns 403 for a plain User', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    const response = await DELETE(jsonRequest('DELETE'), makeParams('invoice-1'));
    expect(response.status).toBe(403);
    expect(invoicesBackend.deleteInvoice).not.toHaveBeenCalled();
  });

  it('deletes the invoice for an authorized caller', async () => {
    const token = tokenFor('SystemAdmin');
    mockCookieStore.get.mockImplementation((name: string) => (name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined));
    invoicesBackend.deleteInvoice.mockResolvedValue(undefined);

    const response = await DELETE(jsonRequest('DELETE'), makeParams('invoice-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(invoicesBackend.deleteInvoice).toHaveBeenCalledWith('invoice-1', token);
  });

  it('returns a normalized error when the backend rejects a non-Draft delete', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );
    invoicesBackend.deleteInvoice.mockRejectedValue(new Error('only Draft invoices can be deleted'));

    const response = await DELETE(jsonRequest('DELETE'), makeParams('invoice-1'));
    expect(response.status).toBe(500);
  });
});
