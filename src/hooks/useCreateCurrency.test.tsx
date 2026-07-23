import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useCreateCurrency } from './useCreateCurrency';
import type { Currency } from '@/types/domain.types';

jest.mock('../lib/api/currencies.api', () => ({
  createCurrency: jest.fn(),
}));

const currenciesApi = jest.requireMock('../lib/api/currencies.api') as { createCurrency: jest.Mock };

const createdCurrency: Currency = {
  id: 'currency-2',
  code: 'MMK',
  name: 'Myanmar Kyats',
  symbol: 'MMK',
  isBaseCurrency: false,
  isActive: true,
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const values = { code: 'MMK', name: 'Myanmar Kyats', symbol: 'MMK', isBaseCurrency: false, isActive: true };

describe('useCreateCurrency', () => {
  beforeEach(() => {
    currenciesApi.createCurrency.mockReset();
  });

  it('calls createCurrency with the given values', async () => {
    currenciesApi.createCurrency.mockResolvedValue(createdCurrency);
    const { result } = renderHook(() => useCreateCurrency(), { wrapper });

    await act(async () => {
      await result.current.createCurrency(values);
    });

    expect(currenciesApi.createCurrency).toHaveBeenCalledWith(values);
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    currenciesApi.createCurrency.mockRejectedValue(new Error('Currency code already exists.'));
    const { result } = renderHook(() => useCreateCurrency(), { wrapper });

    await act(async () => {
      try {
        await result.current.createCurrency(values);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
