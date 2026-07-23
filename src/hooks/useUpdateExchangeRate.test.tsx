import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useUpdateExchangeRate } from './useUpdateExchangeRate';

jest.mock('../lib/api/exchangeRates.api', () => ({
  updateExchangeRate: jest.fn(),
}));

const exchangeRatesApi = jest.requireMock('../lib/api/exchangeRates.api') as { updateExchangeRate: jest.Mock };

const updatedExchangeRate = {
  id: 'rate-1',
  fromCurrencyId: 'currency-1',
  toCurrencyId: 'currency-2',
  rate: 0.8,
  effectiveDate: '2025-02-01',
  isActive: true,
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const values = { rate: 0.8, effectiveDate: '2025-02-01', isActive: true };

describe('useUpdateExchangeRate', () => {
  beforeEach(() => {
    exchangeRatesApi.updateExchangeRate.mockReset();
  });

  it('calls updateExchangeRate with the given id and values', async () => {
    exchangeRatesApi.updateExchangeRate.mockResolvedValue(updatedExchangeRate);
    const { result } = renderHook(() => useUpdateExchangeRate('rate-1'), { wrapper });

    await act(async () => {
      await result.current.updateExchangeRate(values);
    });

    expect(exchangeRatesApi.updateExchangeRate).toHaveBeenCalledWith('rate-1', values);
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    exchangeRatesApi.updateExchangeRate.mockRejectedValue(new Error('Could not update.'));
    const { result } = renderHook(() => useUpdateExchangeRate('rate-1'), { wrapper });

    await act(async () => {
      try {
        await result.current.updateExchangeRate(values);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
