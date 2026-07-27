import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useExchangeRates } from './useExchangeRates';
import type { ExchangeRate } from '@/types/domain.types';

jest.mock('../lib/api/exchangeRates.api', () => ({
  getExchangeRates: jest.fn(),
}));

const exchangeRatesApi = jest.requireMock('../lib/api/exchangeRates.api') as { getExchangeRates: jest.Mock };

const exchangeRate: ExchangeRate = {
  id: 'rate-1',
  fromCurrency: { id: 'currency-1', code: 'SGD', symbol: 'S$' },
  toCurrency: { id: 'currency-2', code: 'USD', symbol: '$' },
  rate: 0.74,
  effectiveDate: '2025-01-01',
  isActive: true,
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useExchangeRates', () => {
  beforeEach(() => {
    exchangeRatesApi.getExchangeRates.mockReset();
  });

  it('returns exchange rates once loaded', async () => {
    exchangeRatesApi.getExchangeRates.mockResolvedValue({ exchangeRates: [exchangeRate], totalCount: 1 });
    const { result } = renderHook(() => useExchangeRates(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.exchangeRates).toEqual([exchangeRate]);
    expect(result.current.totalCount).toBe(1);
  });

  it('surfaces an error message on failure', async () => {
    exchangeRatesApi.getExchangeRates.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useExchangeRates(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
