import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useInvoice } from './useInvoice';
import type { InvoiceDetail } from '@/types/domain.types';

jest.mock('../lib/api/invoices.api', () => ({
  getInvoice: jest.fn(),
}));

const invoicesApi = jest.requireMock('../lib/api/invoices.api') as { getInvoice: jest.Mock };

const invoice: InvoiceDetail = {
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

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useInvoice', () => {
  beforeEach(() => {
    invoicesApi.getInvoice.mockReset();
  });

  it('returns the invoice once loaded', async () => {
    invoicesApi.getInvoice.mockResolvedValue(invoice);
    const { result } = renderHook(() => useInvoice('invoice-1'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.invoice).toEqual(invoice);
    expect(invoicesApi.getInvoice).toHaveBeenCalledWith('invoice-1');
  });

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useInvoice(''), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(invoicesApi.getInvoice).not.toHaveBeenCalled();
  });

  it('surfaces an error message on failure', async () => {
    invoicesApi.getInvoice.mockRejectedValue(new Error('not found'));
    const { result } = renderHook(() => useInvoice('missing-id'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
