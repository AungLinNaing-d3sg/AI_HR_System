import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useDeleteExchangeRate } from './useDeleteExchangeRate';

jest.mock('../lib/api/exchangeRates.api', () => ({
  deleteExchangeRate: jest.fn(),
}));

const exchangeRatesApi = jest.requireMock('../lib/api/exchangeRates.api') as { deleteExchangeRate: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useDeleteExchangeRate', () => {
  beforeEach(() => {
    exchangeRatesApi.deleteExchangeRate.mockReset();
  });

  it('calls deleteExchangeRate with the given id', async () => {
    exchangeRatesApi.deleteExchangeRate.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteExchangeRate(), { wrapper });

    await act(async () => {
      await result.current.deleteExchangeRate('rate-1');
    });

    expect(exchangeRatesApi.deleteExchangeRate).toHaveBeenCalledWith('rate-1');
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    exchangeRatesApi.deleteExchangeRate.mockRejectedValue(new Error('Exchange rate is in use.'));
    const { result } = renderHook(() => useDeleteExchangeRate(), { wrapper });

    await act(async () => {
      try {
        await result.current.deleteExchangeRate('rate-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
