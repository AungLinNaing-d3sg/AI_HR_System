import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useMarkInvoicePaid } from './useMarkInvoicePaid';

jest.mock('../lib/api/invoices.api', () => ({
  markInvoicePaid: jest.fn(),
}));

const invoicesApi = jest.requireMock('../lib/api/invoices.api') as { markInvoicePaid: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useMarkInvoicePaid', () => {
  beforeEach(() => {
    invoicesApi.markInvoicePaid.mockReset();
  });

  it('marks the invoice with the given id as paid', async () => {
    invoicesApi.markInvoicePaid.mockResolvedValue({ id: 'invoice-1', status: 'Paid' });
    const { result } = renderHook(() => useMarkInvoicePaid(), { wrapper });

    await act(async () => {
      await result.current.markInvoicePaid('invoice-1');
    });

    expect(invoicesApi.markInvoicePaid).toHaveBeenCalledWith('invoice-1');
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    invoicesApi.markInvoicePaid.mockRejectedValue(new Error('invoice not Sent'));
    const { result } = renderHook(() => useMarkInvoicePaid(), { wrapper });

    await act(async () => {
      try {
        await result.current.markInvoicePaid('invoice-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
