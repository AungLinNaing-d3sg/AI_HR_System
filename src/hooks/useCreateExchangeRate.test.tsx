import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useCreateExchangeRate } from './useCreateExchangeRate';

jest.mock('../lib/api/exchangeRates.api', () => ({
  createExchangeRate: jest.fn(),
}));

const exchangeRatesApi = jest.requireMock('../lib/api/exchangeRates.api') as { createExchangeRate: jest.Mock };

const createdExchangeRate = {
  id: 'rate-1',
  fromCurrencyId: 'currency-1',
  toCurrencyId: 'currency-2',
  rate: 0.74,
  effectiveDate: '2025-01-01',
  isActive: true,
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const values = { toCurrencyId: 'currency-2', rate: 0.74, effectiveDate: '2025-01-01', isActive: true };

describe('useCreateExchangeRate', () => {
  beforeEach(() => {
    exchangeRatesApi.createExchangeRate.mockReset();
  });

  it('calls createExchangeRate with the given values', async () => {
    exchangeRatesApi.createExchangeRate.mockResolvedValue(createdExchangeRate);
    const { result } = renderHook(() => useCreateExchangeRate(), { wrapper });

    await act(async () => {
      await result.current.createExchangeRate(values);
    });

    expect(exchangeRatesApi.createExchangeRate).toHaveBeenCalledWith(values);
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    exchangeRatesApi.createExchangeRate.mockRejectedValue(new Error('Target currency must be different.'));
    const { result } = renderHook(() => useCreateExchangeRate(), { wrapper });

    await act(async () => {
      try {
        await result.current.createExchangeRate(values);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
