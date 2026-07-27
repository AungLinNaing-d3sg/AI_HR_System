import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useDeleteCurrency } from './useDeleteCurrency';

jest.mock('../lib/api/currencies.api', () => ({
  deleteCurrency: jest.fn(),
}));

const currenciesApi = jest.requireMock('../lib/api/currencies.api') as { deleteCurrency: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useDeleteCurrency', () => {
  beforeEach(() => {
    currenciesApi.deleteCurrency.mockReset();
  });

  it('calls deleteCurrency with the given id', async () => {
    currenciesApi.deleteCurrency.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteCurrency(), { wrapper });

    await act(async () => {
      await result.current.deleteCurrency('currency-3');
    });

    expect(currenciesApi.deleteCurrency).toHaveBeenCalledWith('currency-3');
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    currenciesApi.deleteCurrency.mockRejectedValue(new Error('Currency is in use.'));
    const { result } = renderHook(() => useDeleteCurrency(), { wrapper });

    await act(async () => {
      try {
        await result.current.deleteCurrency('currency-3');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
