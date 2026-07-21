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

jest.mock('../../../lib/api/invoicesBackend.api', () => ({
  getAllInvoices: jest.fn(),
  generateInvoice: jest.fn(),
}));

const invoicesBackend = jest.requireMock('../../../lib/api/invoicesBackend.api') as {
  getAllInvoices: jest.Mock;
  generateInvoice: jest.Mock;
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

function getRequest(query = ''): Request {
  return new Request(`https://example.com/api/invoices${query}`);
}

function postRequest(body?: unknown): Request {
  return new Request('https://example.com/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const listDto = {
  Items: [
    {
      Id: 'invoice-1',
      InvoiceNumber: 'INV-2025-0001',
      Project: { Id: 'project-1', Code: 'PRJ-001', Name: 'Project Helix' },
      ClientName: 'TM',
      BillingPeriodStart: '2025-03-01',
      BillingPeriodEnd: '2025-03-31',
      Currency: { Code: 'SGD', Symbol: 'S$' },
      TotalAmount: 1800,
      Status: 'Draft',
      IssuedDate: '2025-04-01',
      DueDate: '2025-04-10',
    },
  ],
  TotalCount: 1,
  Page: 1,
  PageSize: 200,
};

const generateResponseDto = {
  Id: 'invoice-1',
  InvoiceNumber: 'INV-2025-0001',
  ProjectId: 'project-1',
  ProjectName: 'Project Helix',
  ClientName: 'TM',
  BillingPeriodStart: '2025-03-01',
  BillingPeriodEnd: '2025-03-31',
  Currency: { Code: 'SGD', Symbol: 'S$' },
  ExchangeRate: 1,
  SubTotal: 1800,
  TaxAmount: 0,
  TotalAmount: 1800,
  Status: 'Draft',
  LineItemCount: 7,
};

const validGeneratePayload = {
  projectId: 'project-1',
  billingPeriodStart: '2025-03-01',
  billingPeriodEnd: '2025-03-31',
  currencyId: 'currency-1',
  clientName: 'TM',
  clientEmail: 'billing@tm.com',
  issuedDate: '2025-04-01',
  dueDate: '2025-04-10',
  notes: 'Invoice for March services',
};

describe('GET /api/invoices', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    invoicesBackend.getAllInvoices.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
    expect(invoicesBackend.getAllInvoices).not.toHaveBeenCalled();
  });

  it('returns 403 for a plain User', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    const response = await GET(getRequest());
    expect(response.status).toBe(403);
    expect(invoicesBackend.getAllInvoices).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid status filter', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    const response = await GET(getRequest('?status=Finalized'));
    expect(response.status).toBe(400);
    expect(invoicesBackend.getAllInvoices).not.toHaveBeenCalled();
  });

  it('lists invoices for a ProjectAdmin and maps the response', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('ProjectAdmin') } : undefined
    );
    invoicesBackend.getAllInvoices.mockResolvedValue(listDto);

    const response = await GET(getRequest('?projectId=project-1&status=Draft'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(invoicesBackend.getAllInvoices).toHaveBeenCalledWith(
      { projectId: 'project-1', status: 'Draft', page: 1, pageSize: 200 },
      expect.any(String)
    );
    expect(body.totalCount).toBe(1);
    expect(body.invoices[0].invoiceNumber).toBe('INV-2025-0001');
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    invoicesBackend.getAllInvoices.mockRejectedValue(new Error('network down'));

    const response = await GET(getRequest());
    expect(response.status).toBe(500);
  });
});

describe('POST /api/invoices', () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    invoicesBackend.generateInvoice.mockReset();
  });

  it('returns 401 when there is no access token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const response = await POST(postRequest(validGeneratePayload));
    expect(response.status).toBe(401);
    expect(invoicesBackend.generateInvoice).not.toHaveBeenCalled();
  });

  it('returns 403 for a plain User', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('User') } : undefined
    );
    const response = await POST(postRequest(validGeneratePayload));
    expect(response.status).toBe(403);
    expect(invoicesBackend.generateInvoice).not.toHaveBeenCalled();
  });

  it('returns 400 when the payload fails validation', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    const response = await POST(postRequest({ ...validGeneratePayload, projectId: '' }));
    expect(response.status).toBe(400);
    expect(invoicesBackend.generateInvoice).not.toHaveBeenCalled();
  });

  it('generates the invoice for a ProjectAdmin and maps the response', async () => {
    const token = tokenFor('ProjectAdmin');
    mockCookieStore.get.mockImplementation((name: string) => (name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined));
    invoicesBackend.generateInvoice.mockResolvedValue(generateResponseDto);

    const response = await POST(postRequest(validGeneratePayload));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(invoicesBackend.generateInvoice).toHaveBeenCalledWith(
      {
        ProjectId: 'project-1',
        BillingPeriodStart: '2025-03-01',
        BillingPeriodEnd: '2025-03-31',
        CurrencyId: 'currency-1',
        ClientName: 'TM',
        ClientEmail: 'billing@tm.com',
        IssuedDate: '2025-04-01',
        DueDate: '2025-04-10',
        Notes: 'Invoice for March services',
      },
      token
    );
    expect(body.invoice.invoiceNumber).toBe('INV-2025-0001');
  });

  it('returns a normalized error when the backend call fails', async () => {
    mockCookieStore.get.mockImplementation((name: string) =>
      name === ACCESS_TOKEN_COOKIE ? { value: tokenFor('SystemAdmin') } : undefined
    );
    invoicesBackend.generateInvoice.mockRejectedValue(new Error('no approved entries'));

    const response = await POST(postRequest(validGeneratePayload));
    expect(response.status).toBe(500);
  });
});
