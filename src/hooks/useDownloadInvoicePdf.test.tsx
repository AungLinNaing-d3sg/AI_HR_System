import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useDownloadInvoicePdf } from './useDownloadInvoicePdf';

jest.mock('../lib/api/invoices.api', () => ({
  downloadInvoicePdf: jest.fn(),
}));

const invoicesApi = jest.requireMock('../lib/api/invoices.api') as { downloadInvoicePdf: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useDownloadInvoicePdf', () => {
  beforeEach(() => {
    invoicesApi.downloadInvoicePdf.mockReset();
  });

  it('calls downloadInvoicePdf with the given id and invoice number', async () => {
    invoicesApi.downloadInvoicePdf.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDownloadInvoicePdf(), { wrapper });

    await act(async () => {
      await result.current.downloadInvoicePdf({ id: 'invoice-1', invoiceNumber: 'INV-2025-0001' });
    });

    expect(invoicesApi.downloadInvoicePdf).toHaveBeenCalledWith('invoice-1', 'INV-2025-0001');
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    invoicesApi.downloadInvoicePdf.mockRejectedValue(new Error('invoice not found'));
    const { result } = renderHook(() => useDownloadInvoicePdf(), { wrapper });

    await act(async () => {
      try {
        await result.current.downloadInvoicePdf({ id: 'invoice-1', invoiceNumber: 'INV-2025-0001' });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
