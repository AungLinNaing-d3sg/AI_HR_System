import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useUpdateRateCard } from './useUpdateRateCard';

jest.mock('../lib/api/rateCards.api', () => ({
  updateRateCard: jest.fn(),
}));

const rateCardsApi = jest.requireMock('../lib/api/rateCards.api') as { updateRateCard: jest.Mock };

const updatedRateCard = {
  id: 'rate-card-1',
  countryId: 'country-1',
  resourceRoleTypeId: 'role-1',
  currencyId: 'currency-1',
  hourlyRate: 25,
  billingRate: 450,
  effectiveDate: '2025-02-01',
  isActive: true,
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const values = { hourlyRate: 25, billingRate: 450, effectiveDate: '2025-02-01', isActive: true };

describe('useUpdateRateCard', () => {
  beforeEach(() => {
    rateCardsApi.updateRateCard.mockReset();
  });

  it('calls updateRateCard with the given id and values', async () => {
    rateCardsApi.updateRateCard.mockResolvedValue(updatedRateCard);
    const { result } = renderHook(() => useUpdateRateCard('rate-card-1'), { wrapper });

    await act(async () => {
      await result.current.updateRateCard(values);
    });

    expect(rateCardsApi.updateRateCard).toHaveBeenCalledWith('rate-card-1', values);
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    rateCardsApi.updateRateCard.mockRejectedValue(new Error('Could not update.'));
    const { result } = renderHook(() => useUpdateRateCard('rate-card-1'), { wrapper });

    await act(async () => {
      try {
        await result.current.updateRateCard(values);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
