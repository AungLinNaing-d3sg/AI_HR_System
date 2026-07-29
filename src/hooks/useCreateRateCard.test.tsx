import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useCreateRateCard } from './useCreateRateCard';

jest.mock('../lib/api/rateCards.api', () => ({
  createRateCard: jest.fn(),
}));

const rateCardsApi = jest.requireMock('../lib/api/rateCards.api') as { createRateCard: jest.Mock };

const createdRateCard = {
  id: 'rate-card-1',
  countryId: 'country-1',
  resourceRoleTypeId: 'role-1',
  currencyId: 'currency-1',
  hourlyRate: 20,
  billingRate: 400,
  effectiveDate: '2025-01-01',
  isActive: true,
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const values = {
  countryId: 'country-1',
  resourceRoleTypeId: 'role-1',
  currencyId: 'currency-1',
  hourlyRate: 20,
  billingRate: 400,
  effectiveDate: '2025-01-01',
  isActive: true,
};

describe('useCreateRateCard', () => {
  beforeEach(() => {
    rateCardsApi.createRateCard.mockReset();
  });

  it('calls createRateCard with the given values', async () => {
    rateCardsApi.createRateCard.mockResolvedValue(createdRateCard);
    const { result } = renderHook(() => useCreateRateCard(), { wrapper });

    await act(async () => {
      await result.current.createRateCard(values);
    });

    expect(rateCardsApi.createRateCard).toHaveBeenCalledWith(values);
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    rateCardsApi.createRateCard.mockRejectedValue(new Error('A rate card for this country/role already exists.'));
    const { result } = renderHook(() => useCreateRateCard(), { wrapper });

    await act(async () => {
      try {
        await result.current.createRateCard(values);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
