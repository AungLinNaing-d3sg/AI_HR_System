import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useCreateCountry } from './useCreateCountry';
import type { Country } from '@/types/domain.types';

jest.mock('../lib/api/countries.api', () => ({
  createCountry: jest.fn(),
}));

const countriesApi = jest.requireMock('../lib/api/countries.api') as { createCountry: jest.Mock };

const createdCountry: Country = {
  id: 'aa532dd2-1a51-4be0-b09b-be3d99ea15f3',
  code: 'MM',
  name: 'Myanmar',
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const values = { code: 'MM', name: 'Myanmar' };

describe('useCreateCountry', () => {
  beforeEach(() => {
    countriesApi.createCountry.mockReset();
  });

  it('calls createCountry with the given values', async () => {
    countriesApi.createCountry.mockResolvedValue(createdCountry);
    const { result } = renderHook(() => useCreateCountry(), { wrapper });

    await act(async () => {
      await result.current.createCountry(values);
    });

    expect(countriesApi.createCountry).toHaveBeenCalledWith(values);
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    countriesApi.createCountry.mockRejectedValue(new Error('Country code already exists.'));
    const { result } = renderHook(() => useCreateCountry(), { wrapper });

    await act(async () => {
      try {
        await result.current.createCountry(values);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
