import { AxiosError, AxiosHeaders } from 'axios';
import { axiosInstance } from './axios';
import { useAuthStore } from '@/stores/auth.store';
import type { AuthenticatedUser } from '@/types/domain.types';

const user: AuthenticatedUser = {
  id: 'user-1',
  username: 'jdoe',
  email: 'jdoe@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  employeeId: null,
  countryId: null,
  role: 'User',
};

/** Axios doesn't expose a public way to invoke a registered interceptor directly, so this reaches into the (stable, widely relied-upon) internal `handlers` array. */
function getResponseErrorInterceptor(): (error: unknown) => Promise<never> {
  const handlers = (
    axiosInstance.interceptors.response as unknown as {
      handlers: Array<{ rejected: (error: unknown) => Promise<never> }>;
    }
  ).handlers;
  const handler = handlers[handlers.length - 1]?.rejected;
  if (!handler) throw new Error('No response error interceptor registered.');
  return handler;
}

describe('axiosInstance', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, hasHydrated: true });
  });

  it('is configured for same-origin BFF calls with credentials included', () => {
    expect(axiosInstance.defaults.baseURL).toBe('/api');
    expect(axiosInstance.defaults.withCredentials).toBe(true);
  });

  it('clears the locally-held user on a 401 response', async () => {
    useAuthStore.getState().setUser(user);

    const error = new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 401,
      statusText: '',
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
      data: { message: 'Session expired' },
    });

    await expect(getResponseErrorInterceptor()(error)).rejects.toBe(error);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('leaves the locally-held user untouched for non-401 errors', async () => {
    useAuthStore.getState().setUser(user);

    const error = new AxiosError('Server error', 'ERR_BAD_RESPONSE', undefined, undefined, {
      status: 500,
      statusText: '',
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
      data: {},
    });

    await expect(getResponseErrorInterceptor()(error)).rejects.toBe(error);
    expect(useAuthStore.getState().user).toEqual(user);
  });
});
