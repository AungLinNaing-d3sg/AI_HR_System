import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useSendInvoice } from './useSendInvoice';

jest.mock('../lib/api/invoices.api', () => ({
  sendInvoice: jest.fn(),
}));

const invoicesApi = jest.requireMock('../lib/api/invoices.api') as { sendInvoice: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useSendInvoice', () => {
  beforeEach(() => {
    invoicesApi.sendInvoice.mockReset();
  });

  it('sends the invoice with the given id', async () => {
    invoicesApi.sendInvoice.mockResolvedValue({ id: 'invoice-1', status: 'Sent' });
    const { result } = renderHook(() => useSendInvoice(), { wrapper });

    await act(async () => {
      await result.current.sendInvoice('invoice-1');
    });

    expect(invoicesApi.sendInvoice).toHaveBeenCalledWith('invoice-1');
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    invoicesApi.sendInvoice.mockRejectedValue(new Error('invoice not found'));
    const { result } = renderHook(() => useSendInvoice(), { wrapper });

    await act(async () => {
      try {
        await result.current.sendInvoice('invoice-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
