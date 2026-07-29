import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useRateCards } from './useRateCards';
import type { RateCard } from '@/types/domain.types';

jest.mock('../lib/api/rateCards.api', () => ({
  getRateCards: jest.fn(),
}));

const rateCardsApi = jest.requireMock('../lib/api/rateCards.api') as { getRateCards: jest.Mock };

const rateCard: RateCard = {
  id: 'rate-card-1',
  country: { id: 'country-1', code: 'SG', name: 'Singapore' },
  resourceRoleType: { id: 'role-1', name: 'Junior Developer' },
  currency: { id: 'currency-1', code: 'SGD', symbol: 'S$' },
  hourlyRate: 20,
  billingRate: 400,
  effectiveDate: '2025-01-01',
  isActive: true,
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useRateCards', () => {
  beforeEach(() => {
    rateCardsApi.getRateCards.mockReset();
  });

  it('returns rate cards once loaded', async () => {
    rateCardsApi.getRateCards.mockResolvedValue({ rateCards: [rateCard], totalCount: 1 });
    const { result } = renderHook(() => useRateCards(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rateCards).toEqual([rateCard]);
    expect(result.current.totalCount).toBe(1);
  });

  it('surfaces an error message on failure', async () => {
    rateCardsApi.getRateCards.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useRateCards(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
