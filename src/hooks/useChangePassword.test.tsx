import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useChangePassword } from './useChangePassword';

jest.mock('../lib/api/auth.api', () => ({
  changePassword: jest.fn(),
}));

const authApi = jest.requireMock('../lib/api/auth.api') as { changePassword: jest.Mock };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const values = {
  currentPassword: 'OldPass@123',
  newPassword: 'NewPass@123',
  confirmNewPassword: 'NewPass@123',
};

describe('useChangePassword', () => {
  beforeEach(() => {
    authApi.changePassword.mockReset();
  });

  it('reports success after the password is changed', async () => {
    authApi.changePassword.mockResolvedValue(undefined);
    const { result } = renderHook(() => useChangePassword(), { wrapper });

    await act(async () => {
      await result.current.changePassword(values);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('surfaces an error message on failure', async () => {
    authApi.changePassword.mockRejectedValue(new Error('failed'));
    const { result } = renderHook(() => useChangePassword(), { wrapper });

    await act(async () => {
      try {
        await result.current.changePassword(values);
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
