import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useDeleteRateCard } from './useDeleteRateCard';

jest.mock('../lib/api/rateCards.api', () => ({
  deleteRateCard: jest.fn(),
}));

const rateCardsApi = jest.requireMock('../lib/api/rateCards.api') as { deleteRateCard: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useDeleteRateCard', () => {
  beforeEach(() => {
    rateCardsApi.deleteRateCard.mockReset();
  });

  it('calls deleteRateCard with the given id', async () => {
    rateCardsApi.deleteRateCard.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteRateCard(), { wrapper });

    await act(async () => {
      await result.current.deleteRateCard('rate-card-1');
    });

    expect(rateCardsApi.deleteRateCard).toHaveBeenCalledWith('rate-card-1');
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    rateCardsApi.deleteRateCard.mockRejectedValue(new Error('Rate card is in use.'));
    const { result } = renderHook(() => useDeleteRateCard(), { wrapper });

    await act(async () => {
      try {
        await result.current.deleteRateCard('rate-card-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
