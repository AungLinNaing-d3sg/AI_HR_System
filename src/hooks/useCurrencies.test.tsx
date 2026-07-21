import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useCurrencies } from './useCurrencies';
import type { Currency } from '@/types/domain.types';

jest.mock('../lib/api/currencies.api', () => ({
  getCurrencies: jest.fn(),
}));

const currenciesApi = jest.requireMock('../lib/api/currencies.api') as { getCurrencies: jest.Mock };

const currency: Currency = {
  id: 'currency-1',
  code: 'SGD',
  name: 'Singapore Dollar',
  symbol: 'S$',
  isBaseCurrency: true,
  isActive: true,
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useCurrencies', () => {
  beforeEach(() => {
    currenciesApi.getCurrencies.mockReset();
  });

  it('returns currencies once loaded', async () => {
    currenciesApi.getCurrencies.mockResolvedValue([currency]);
    const { result } = renderHook(() => useCurrencies(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.currencies).toEqual([currency]);
  });

  it('surfaces an error message on failure', async () => {
    currenciesApi.getCurrencies.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useCurrencies(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
