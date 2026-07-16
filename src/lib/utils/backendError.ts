import 'server-only';

import { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

export interface BackendErrorDetails {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

/**
 * Normalizes a failed `backendClient` (server-only, calls the real .NET
 * backend) request into a status/message/field-errors shape that Route
 * Handlers can forward to the browser as their own JSON error body,
 * without ever leaking backend stack traces, headers, or other internals.
 */
export function getBackendErrorDetails(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): BackendErrorDetails {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 502;
    const data = error.response?.data as ApiErrorResponse | undefined;
    return {
      status,
      message: data?.Message ?? fallback,
      errors: data?.Errors,
    };
  }
  return { status: 500, message: fallback };
}
