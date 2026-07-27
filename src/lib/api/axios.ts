import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Browser-facing Axios instance. Every domain module under `lib/api/*.api.ts`
 * that is imported by hooks/components is built on this instance, and it
 * only ever talks to this app's own same-origin `/api/*` Route Handlers -
 * never directly to the .NET backend (see `lib/api/backendClient.ts` for
 * that server-only counterpart).
 *
 * Requests never attach an `Authorization` header manually: the access/
 * refresh tokens live in httpOnly cookies the browser sends automatically
 * on same-origin requests, and are never readable from client JavaScript.
 */
export const axiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // The BFF route rejected the request as unauthenticated (e.g. the
      // session could not be silently refreshed). Clear the locally-held
      // profile so the UI doesn't keep showing stale "logged in" state.
      useAuthStore.getState().clearUser();
    }
    return Promise.reject(error);
  }
);
