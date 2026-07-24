import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useUpdateCountry } from './useUpdateCountry';
import type { Country } from '@/types/domain.types';

jest.mock('../lib/api/countries.api', () => ({
  updateCountry: jest.fn(),
}));

const countriesApi = jest.requireMock('../lib/api/countries.api') as { updateCountry: jest.Mock };

const updatedCountry: Country = {
  id: 'aa532dd2-1a51-4be0-b09b-be3d99ea15f3',
  code: 'MM',
  name: 'Union of Myanmar',
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const values = { name: 'Union of Myanmar' };

describe('useUpdateCountry', () => {
  beforeEach(() => {
    countriesApi.updateCountry.mockReset();
  });

  it('calls updateCountry with the given id and values', async () => {
    countriesApi.updateCountry.mockResolvedValue(updatedCountry);
    const { result } = renderHook(() => useUpdateCountry('aa532dd2-1a51-4be0-b09b-be3d99ea15f3'), { wrapper });

    await act(async () => {
      await result.current.updateCountry(values);
    });

    expect(countriesApi.updateCountry).toHaveBeenCalledWith('aa532dd2-1a51-4be0-b09b-be3d99ea15f3', values);
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    countriesApi.updateCountry.mockRejectedValue(new Error('Could not update.'));
    const { result } = renderHook(() => useUpdateCountry('aa532dd2-1a51-4be0-b09b-be3d99ea15f3'), { wrapper });

    await act(async () => {
      try {
        await result.current.updateCountry(values);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
