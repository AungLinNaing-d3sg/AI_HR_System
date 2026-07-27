import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useCountries } from './useCountries';
import type { Country } from '@/types/domain.types';

jest.mock('../lib/api/countries.api', () => ({
  getCountries: jest.fn(),
}));

const countriesApi = jest.requireMock('../lib/api/countries.api') as { getCountries: jest.Mock };

const country: Country = {
  id: '22222222-2222-2222-2222-222222222201',
  code: 'SG',
  name: 'Singapore',
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useCountries', () => {
  beforeEach(() => {
    countriesApi.getCountries.mockReset();
  });

  it('returns countries once loaded', async () => {
    countriesApi.getCountries.mockResolvedValue({ countries: [country], totalCount: 1 });
    const { result } = renderHook(() => useCountries(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.countries).toEqual([country]);
    expect(result.current.totalCount).toBe(1);
  });

  it('surfaces an error message on failure', async () => {
    countriesApi.getCountries.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useCountries(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
