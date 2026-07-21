jest.mock('./axios', () => ({
  axiosInstance: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const { axiosInstance } = jest.requireMock('./axios') as {
  axiosInstance: { get: jest.Mock; post: jest.Mock; put: jest.Mock; delete: jest.Mock };
};

import * as invoicesApi from './invoices.api';
import type { GeneratedInvoice, InvoiceDetail, InvoiceSummary } from '@/types/domain.types';

const invoiceSummary: InvoiceSummary = {
  id: 'invoice-1',
  invoiceNumber: 'INV-2025-0001',
  project: { id: 'project-1', code: 'PRJ-001', name: 'Project Helix' },
  clientName: 'TM',
  billingPeriodStart: '2025-03-01',
  billingPeriodEnd: '2025-03-31',
  currency: { code: 'SGD', symbol: 'S$' },
  totalAmount: 1800,
  status: 'Draft',
  issuedDate: '2025-04-01',
  dueDate: '2025-04-10',
};

const invoiceDetail: InvoiceDetail = {
  id: 'invoice-1',
  invoiceNumber: 'INV-2025-0001',
  project: { id: 'project-1', code: 'PRJ-001', name: 'Project Helix' },
  clientName: 'TM',
  clientEmail: 'billing@tm.com',
  billingPeriodStart: '2025-03-01',
  billingPeriodEnd: '2025-03-31',
  currency: { id: 'currency-1', code: 'USD', symbol: '$' },
  exchangeRate: 1,
  subTotal: 1800,
  taxAmount: 0,
  totalAmount: 1800,
  status: 'Draft',
  issuedDate: '2025-04-01',
  dueDate: '2025-04-10',
  notes: null,
  lineItems: [],
  createdAt: '2026-06-22T12:22:44Z',
};

const generatedInvoice: GeneratedInvoice = {
  id: 'invoice-1',
  invoiceNumber: 'INV-2025-0001',
  projectId: 'project-1',
  projectName: 'Project Helix',
  clientName: 'TM',
  billingPeriodStart: '2025-03-01',
  billingPeriodEnd: '2025-03-31',
  currency: { code: 'SGD', symbol: 'S$' },
  exchangeRate: 1,
  subTotal: 1800,
  taxAmount: 0,
  totalAmount: 1800,
  status: 'Draft',
  lineItemCount: 7,
};

describe('invoices.api (client)', () => {
  beforeEach(() => {
    axiosInstance.get.mockReset();
    axiosInstance.post.mockReset();
    axiosInstance.put.mockReset();
    axiosInstance.delete.mockReset();
  });

  it('getInvoices gets /invoices with the filters and returns the invoice list + total count', async () => {
    axiosInstance.get.mockResolvedValue({ data: { invoices: [invoiceSummary], totalCount: 1 } });
    const result = await invoicesApi.getInvoices({ projectId: 'project-1' });
    expect(axiosInstance.get).toHaveBeenCalledWith('/invoices', { params: { projectId: 'project-1' } });
    expect(result).toEqual({ invoices: [invoiceSummary], totalCount: 1 });
  });

  it('getInvoice gets /invoices/:id and returns the invoice detail', async () => {
    axiosInstance.get.mockResolvedValue({ data: { invoice: invoiceDetail } });
    const result = await invoicesApi.getInvoice('invoice-1');
    expect(axiosInstance.get).toHaveBeenCalledWith('/invoices/invoice-1');
    expect(result).toEqual(invoiceDetail);
  });

  it('generateInvoice posts to /invoices and returns the generated invoice', async () => {
    axiosInstance.post.mockResolvedValue({ data: { invoice: generatedInvoice } });
    const values = {
      projectId: 'project-1',
      billingPeriodStart: '2025-03-01',
      billingPeriodEnd: '2025-03-31',
      currencyId: 'currency-1',
      clientName: 'TM',
      clientEmail: '',
      issuedDate: '2025-04-01',
      dueDate: '2025-04-10',
      notes: '',
    };
    const result = await invoicesApi.generateInvoice(values);
    expect(axiosInstance.post).toHaveBeenCalledWith('/invoices', values);
    expect(result).toEqual(generatedInvoice);
  });

  it('updateInvoice puts to /invoices/:id and returns the updated invoice fields', async () => {
    const updated = {
      id: 'invoice-1',
      invoiceNumber: 'INV-2025-0001',
      clientName: 'TM Updated',
      clientEmail: null,
      issuedDate: '2025-04-01',
      dueDate: '2025-04-10',
      notes: null,
      status: 'Draft' as const,
    };
    axiosInstance.put.mockResolvedValue({ data: { invoice: updated } });
    const values = {
      currencyId: 'currency-1',
      clientName: 'TM Updated',
      clientEmail: '',
      issuedDate: '2025-04-01',
      dueDate: '2025-04-10',
      notes: '',
    };
    const result = await invoicesApi.updateInvoice('invoice-1', values);
    expect(axiosInstance.put).toHaveBeenCalledWith('/invoices/invoice-1', values);
    expect(result).toEqual(updated);
  });

  it('deleteInvoice deletes /invoices/:id', async () => {
    axiosInstance.delete.mockResolvedValue({ data: { success: true } });
    await invoicesApi.deleteInvoice('invoice-1');
    expect(axiosInstance.delete).toHaveBeenCalledWith('/invoices/invoice-1');
  });

  it('sendInvoice puts to /invoices/:id/send and returns the new status', async () => {
    axiosInstance.put.mockResolvedValue({ data: { id: 'invoice-1', status: 'Sent' } });
    const result = await invoicesApi.sendInvoice('invoice-1');
    expect(axiosInstance.put).toHaveBeenCalledWith('/invoices/invoice-1/send');
    expect(result).toEqual({ id: 'invoice-1', status: 'Sent' });
  });

  it('markInvoicePaid puts to /invoices/:id/mark-paid and returns the new status', async () => {
    axiosInstance.put.mockResolvedValue({ data: { id: 'invoice-1', status: 'Paid' } });
    const result = await invoicesApi.markInvoicePaid('invoice-1');
    expect(axiosInstance.put).toHaveBeenCalledWith('/invoices/invoice-1/mark-paid');
    expect(result).toEqual({ id: 'invoice-1', status: 'Paid' });
  });

  it('voidInvoice puts to /invoices/:id/void and returns the new status', async () => {
    axiosInstance.put.mockResolvedValue({ data: { id: 'invoice-1', status: 'Void' } });
    const result = await invoicesApi.voidInvoice('invoice-1');
    expect(axiosInstance.put).toHaveBeenCalledWith('/invoices/invoice-1/void');
    expect(result).toEqual({ id: 'invoice-1', status: 'Void' });
  });

  it('cancelInvoice puts to /invoices/:id/cancel and returns the new status', async () => {
    axiosInstance.put.mockResolvedValue({ data: { id: 'invoice-1', status: 'Cancelled' } });
    const result = await invoicesApi.cancelInvoice('invoice-1');
    expect(axiosInstance.put).toHaveBeenCalledWith('/invoices/invoice-1/cancel');
    expect(result).toEqual({ id: 'invoice-1', status: 'Cancelled' });
  });

  it('downloadInvoicePdf gets /invoices/:id/pdf as a blob and triggers a download', async () => {
    const blob = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    axiosInstance.get.mockResolvedValue({ data: blob });

    const createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = jest.fn();
    Object.defineProperty(window.URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(window.URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await invoicesApi.downloadInvoicePdf('invoice-1', 'INV-2025-0001');

    expect(axiosInstance.get).toHaveBeenCalledWith('/invoices/invoice-1/pdf', { responseType: 'blob' });
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    clickSpy.mockRestore();
  });
});
