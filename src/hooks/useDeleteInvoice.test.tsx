import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useDeleteInvoice } from './useDeleteInvoice';

jest.mock('../lib/api/invoices.api', () => ({
  deleteInvoice: jest.fn(),
}));

const invoicesApi = jest.requireMock('../lib/api/invoices.api') as { deleteInvoice: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useDeleteInvoice', () => {
  beforeEach(() => {
    invoicesApi.deleteInvoice.mockReset();
  });

  it('calls deleteInvoice with the given id', async () => {
    invoicesApi.deleteInvoice.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteInvoice(), { wrapper });

    await act(async () => {
      await result.current.deleteInvoice('invoice-1');
    });

    expect(invoicesApi.deleteInvoice).toHaveBeenCalledWith('invoice-1');
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    invoicesApi.deleteInvoice.mockRejectedValue(new Error('only Draft invoices can be deleted'));
    const { result } = renderHook(() => useDeleteInvoice(), { wrapper });

    await act(async () => {
      try {
        await result.current.deleteInvoice('invoice-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
