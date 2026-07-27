import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useUpdateCurrency } from './useUpdateCurrency';
import type { Currency } from '@/types/domain.types';

jest.mock('../lib/api/currencies.api', () => ({
  updateCurrency: jest.fn(),
}));

const currenciesApi = jest.requireMock('../lib/api/currencies.api') as { updateCurrency: jest.Mock };

const updatedCurrency: Currency = {
  id: 'currency-1',
  code: 'SGD',
  name: 'Singapore Dollar',
  symbol: 'SGD',
  isBaseCurrency: true,
  isActive: true,
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const values = { name: 'Singapore Dollar', symbol: 'SGD', isActive: true };

describe('useUpdateCurrency', () => {
  beforeEach(() => {
    currenciesApi.updateCurrency.mockReset();
  });

  it('calls updateCurrency with the given id and values', async () => {
    currenciesApi.updateCurrency.mockResolvedValue(updatedCurrency);
    const { result } = renderHook(() => useUpdateCurrency('currency-1'), { wrapper });

    await act(async () => {
      await result.current.updateCurrency(values);
    });

    expect(currenciesApi.updateCurrency).toHaveBeenCalledWith('currency-1', values);
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    currenciesApi.updateCurrency.mockRejectedValue(new Error('Could not update.'));
    const { result } = renderHook(() => useUpdateCurrency('currency-1'), { wrapper });

    await act(async () => {
      try {
        await result.current.updateCurrency(values);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
