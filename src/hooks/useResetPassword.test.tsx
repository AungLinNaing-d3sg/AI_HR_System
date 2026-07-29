import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useResetPassword } from './useResetPassword';

jest.mock('../lib/api/auth.api', () => ({
  resetPassword: jest.fn(),
}));

const authApi = jest.requireMock('../lib/api/auth.api') as { resetPassword: jest.Mock };

const values = {
  newPassword: 'NewPass@123',
  confirmNewPassword: 'NewPass@123',
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useResetPassword', () => {
  beforeEach(() => {
    authApi.resetPassword.mockReset();
  });

  it('calls resetPassword with the given id and values', async () => {
    authApi.resetPassword.mockResolvedValue(undefined);
    const { result } = renderHook(() => useResetPassword(), { wrapper });

    await act(async () => {
      await result.current.resetPassword({ id: 'user-2', values });
    });

    expect(authApi.resetPassword).toHaveBeenCalledWith('user-2', values);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    authApi.resetPassword.mockRejectedValue(new Error('Could not reset.'));
    const { result } = renderHook(() => useResetPassword(), { wrapper });

    await act(async () => {
      try {
        await result.current.resetPassword({ id: 'user-2', values });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
