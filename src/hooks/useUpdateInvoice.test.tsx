import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useUpdateInvoice } from './useUpdateInvoice';

jest.mock('../lib/api/invoices.api', () => ({
  updateInvoice: jest.fn(),
}));

const invoicesApi = jest.requireMock('../lib/api/invoices.api') as { updateInvoice: jest.Mock };

const values = {
  currencyId: 'currency-1',
  clientName: 'TM Updated',
  clientEmail: '',
  issuedDate: '2025-04-01',
  dueDate: '2025-04-10',
  notes: '',
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useUpdateInvoice', () => {
  beforeEach(() => {
    invoicesApi.updateInvoice.mockReset();
  });

  it('reports success after the invoice is updated', async () => {
    invoicesApi.updateInvoice.mockResolvedValue({
      id: 'invoice-1',
      invoiceNumber: 'INV-2025-0001',
      clientName: 'TM Updated',
      clientEmail: null,
      issuedDate: '2025-04-01',
      dueDate: '2025-04-10',
      notes: null,
      status: 'Draft',
    });
    const { result } = renderHook(() => useUpdateInvoice('invoice-1'), { wrapper });

    await act(async () => {
      await result.current.updateInvoice(values);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoicesApi.updateInvoice).toHaveBeenCalledWith('invoice-1', values);
  });

  it('surfaces an error message on failure', async () => {
    invoicesApi.updateInvoice.mockRejectedValue(new Error('only Draft invoices can be updated'));
    const { result } = renderHook(() => useUpdateInvoice('invoice-1'), { wrapper });

    await act(async () => {
      try {
        await result.current.updateInvoice(values);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
