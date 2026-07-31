/**
 * @jest-environment node
 */
jest.mock('./backendClient', () => ({
  backendClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const { backendClient } = jest.requireMock('./backendClient') as {
  backendClient: { get: jest.Mock; post: jest.Mock; put: jest.Mock; delete: jest.Mock };
};

import * as invoicesBackend from './invoicesBackend.api';

describe('invoicesBackend.api (server)', () => {
  beforeEach(() => {
    backendClient.get.mockReset();
    backendClient.post.mockReset();
    backendClient.put.mockReset();
    backendClient.delete.mockReset();
  });

  it('getAllInvoices gets /Invoice/GetAllInvoices with the query params and a Bearer header', async () => {
    backendClient.get.mockResolvedValue({ data: { Items: [], TotalCount: 0, Page: 1, PageSize: 200 } });
    await invoicesBackend.getAllInvoices({ projectId: 'project-1', page: 1, pageSize: 200 }, 'access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Invoice/GetAllInvoices', {
      headers: { Authorization: 'Bearer access-token' },
      params: { projectId: 'project-1', page: 1, pageSize: 200 },
    });
  });

  it('getMyInvoices gets /Invoice/GetMyInvoices with the query params and a Bearer header', async () => {
    backendClient.get.mockResolvedValue({ data: { Items: [], TotalCount: 0, Page: 1, PageSize: 200 } });
    await invoicesBackend.getMyInvoices({ projectId: 'project-1', page: 1, pageSize: 200 }, 'access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Invoice/GetMyInvoices', {
      headers: { Authorization: 'Bearer access-token' },
      params: { projectId: 'project-1', page: 1, pageSize: 200 },
    });
  });

  it('getInvoiceById gets /Invoice/GetInvoiceById/:id with a Bearer header', async () => {
    backendClient.get.mockResolvedValue({ data: { Id: 'invoice-1' } });
    await invoicesBackend.getInvoiceById('invoice-1', 'access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Invoice/GetInvoiceById/invoice-1', {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('generateInvoice posts to /Invoice/GenerateInvoice with a Bearer header', async () => {
    backendClient.post.mockResolvedValue({ data: { Id: 'invoice-1' } });
    const payload = {
      ProjectId: 'project-1',
      BillingPeriodStart: '2025-03-01',
      BillingPeriodEnd: '2025-03-31',
      CurrencyId: 'currency-1',
      ClientName: 'TM',
      IssuedDate: '2025-04-01',
      DueDate: '2025-04-10',
    };
    await invoicesBackend.generateInvoice(payload, 'access-token');
    expect(backendClient.post).toHaveBeenCalledWith('/Invoice/GenerateInvoice', payload, {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('updateInvoice puts to /Invoice/UpdateInvoice/:id with a Bearer header', async () => {
    backendClient.put.mockResolvedValue({ data: { Id: 'invoice-1' } });
    const payload = { ClientName: 'Updated Client' };
    await invoicesBackend.updateInvoice('invoice-1', payload, 'access-token');
    expect(backendClient.put).toHaveBeenCalledWith('/Invoice/UpdateInvoice/invoice-1', payload, {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('sendInvoice puts to /Invoice/SendInvoice/:id with no body and a Bearer header', async () => {
    backendClient.put.mockResolvedValue({ data: { Id: 'invoice-1', Status: 'Sent' } });
    await invoicesBackend.sendInvoice('invoice-1', 'access-token');
    expect(backendClient.put).toHaveBeenCalledWith('/Invoice/SendInvoice/invoice-1', null, {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('markInvoicePaid puts to /Invoice/MarkInvoicePaid/:id with no body and a Bearer header', async () => {
    backendClient.put.mockResolvedValue({ data: { Id: 'invoice-1', Status: 'Paid' } });
    await invoicesBackend.markInvoicePaid('invoice-1', 'access-token');
    expect(backendClient.put).toHaveBeenCalledWith('/Invoice/MarkInvoicePaid/invoice-1', null, {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('voidInvoice puts to /Invoice/VoidInvoice/:id with no body and a Bearer header', async () => {
    backendClient.put.mockResolvedValue({ data: { Id: 'invoice-1', Status: 'Void' } });
    await invoicesBackend.voidInvoice('invoice-1', 'access-token');
    expect(backendClient.put).toHaveBeenCalledWith('/Invoice/VoidInvoice/invoice-1', null, {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('cancelInvoice puts to /Invoice/CancelInvoice/:id with no body and a Bearer header', async () => {
    backendClient.put.mockResolvedValue({ data: { Id: 'invoice-1', Status: 'Cancelled' } });
    await invoicesBackend.cancelInvoice('invoice-1', 'access-token');
    expect(backendClient.put).toHaveBeenCalledWith('/Invoice/CancelInvoice/invoice-1', null, {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('deleteInvoice deletes /Invoice/DeleteInvoice/:id with a Bearer header', async () => {
    backendClient.delete.mockResolvedValue({ data: null });
    await invoicesBackend.deleteInvoice('invoice-1', 'access-token');
    expect(backendClient.delete).toHaveBeenCalledWith('/Invoice/DeleteInvoice/invoice-1', {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('getInvoicePdf gets /Invoice/GetInvoicePdf/:id as an arraybuffer with a Bearer header', async () => {
    const buffer = new ArrayBuffer(4);
    backendClient.get.mockResolvedValue({ data: buffer, headers: { 'content-type': 'application/pdf' } });
    const result = await invoicesBackend.getInvoicePdf('invoice-1', 'access-token');
    expect(backendClient.get).toHaveBeenCalledWith('/Invoice/GetInvoicePdf/invoice-1', {
      headers: { Authorization: 'Bearer access-token' },
      responseType: 'arraybuffer',
    });
    expect(result).toEqual({ data: buffer, contentType: 'application/pdf' });
  });

  it('getInvoicePdf falls back to application/pdf when no content-type header is present', async () => {
    const buffer = new ArrayBuffer(4);
    backendClient.get.mockResolvedValue({ data: buffer, headers: undefined });
    const result = await invoicesBackend.getInvoicePdf('invoice-1', 'access-token');
    expect(result.contentType).toBe('application/pdf');
  });
});
