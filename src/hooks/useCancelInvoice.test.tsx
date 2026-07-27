import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useCancelInvoice } from './useCancelInvoice';

jest.mock('../lib/api/invoices.api', () => ({
  cancelInvoice: jest.fn(),
}));

const invoicesApi = jest.requireMock('../lib/api/invoices.api') as { cancelInvoice: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useCancelInvoice', () => {
  beforeEach(() => {
    invoicesApi.cancelInvoice.mockReset();
  });

  it('cancels the invoice with the given id', async () => {
    invoicesApi.cancelInvoice.mockResolvedValue({ id: 'invoice-1', status: 'Cancelled' });
    const { result } = renderHook(() => useCancelInvoice(), { wrapper });

    await act(async () => {
      await result.current.cancelInvoice('invoice-1');
    });

    expect(invoicesApi.cancelInvoice).toHaveBeenCalledWith('invoice-1');
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    invoicesApi.cancelInvoice.mockRejectedValue(new Error('invoice not found'));
    const { result } = renderHook(() => useCancelInvoice(), { wrapper });

    await act(async () => {
      try {
        await result.current.cancelInvoice('invoice-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
