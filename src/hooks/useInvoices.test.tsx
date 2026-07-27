import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useInvoices } from './useInvoices';
import type { InvoiceSummary } from '@/types/domain.types';

jest.mock('../lib/api/invoices.api', () => ({
  getInvoices: jest.fn(),
}));

const invoicesApi = jest.requireMock('../lib/api/invoices.api') as { getInvoices: jest.Mock };

const invoice: InvoiceSummary = {
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

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useInvoices', () => {
  beforeEach(() => {
    invoicesApi.getInvoices.mockReset();
  });

  it('returns invoices and the total count once loaded', async () => {
    invoicesApi.getInvoices.mockResolvedValue({ invoices: [invoice], totalCount: 1 });
    const { result } = renderHook(() => useInvoices(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.invoices).toEqual([invoice]);
    expect(result.current.totalCount).toBe(1);
    expect(invoicesApi.getInvoices).toHaveBeenCalledWith({});
  });

  it('passes filters through to the API module', async () => {
    invoicesApi.getInvoices.mockResolvedValue({ invoices: [], totalCount: 0 });
    renderHook(() => useInvoices({ projectId: 'project-1', status: 'Draft' }), { wrapper });

    await waitFor(() => expect(invoicesApi.getInvoices).toHaveBeenCalledWith({ projectId: 'project-1', status: 'Draft' }));
  });

  it('surfaces an error message on failure', async () => {
    invoicesApi.getInvoices.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useInvoices(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
