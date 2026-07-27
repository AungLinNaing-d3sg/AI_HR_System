import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useDeleteCountry } from './useDeleteCountry';

jest.mock('../lib/api/countries.api', () => ({
  deleteCountry: jest.fn(),
}));

const countriesApi = jest.requireMock('../lib/api/countries.api') as { deleteCountry: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useDeleteCountry', () => {
  beforeEach(() => {
    countriesApi.deleteCountry.mockReset();
  });

  it('calls deleteCountry with the given id', async () => {
    countriesApi.deleteCountry.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteCountry(), { wrapper });

    await act(async () => {
      await result.current.deleteCountry('country-3');
    });

    expect(countriesApi.deleteCountry).toHaveBeenCalledWith('country-3');
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    countriesApi.deleteCountry.mockRejectedValue(new Error('Country is in use.'));
    const { result } = renderHook(() => useDeleteCountry(), { wrapper });

    await act(async () => {
      try {
        await result.current.deleteCountry('country-3');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
