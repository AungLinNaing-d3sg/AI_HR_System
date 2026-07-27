import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useVoidInvoice } from './useVoidInvoice';

jest.mock('../lib/api/invoices.api', () => ({
  voidInvoice: jest.fn(),
}));

const invoicesApi = jest.requireMock('../lib/api/invoices.api') as { voidInvoice: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useVoidInvoice', () => {
  beforeEach(() => {
    invoicesApi.voidInvoice.mockReset();
  });

  it('voids the invoice with the given id', async () => {
    invoicesApi.voidInvoice.mockResolvedValue({ id: 'invoice-1', status: 'Void' });
    const { result } = renderHook(() => useVoidInvoice(), { wrapper });

    await act(async () => {
      await result.current.voidInvoice('invoice-1');
    });

    expect(invoicesApi.voidInvoice).toHaveBeenCalledWith('invoice-1');
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    invoicesApi.voidInvoice.mockRejectedValue(new Error('invoice not found'));
    const { result } = renderHook(() => useVoidInvoice(), { wrapper });

    await act(async () => {
      try {
        await result.current.voidInvoice('invoice-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
