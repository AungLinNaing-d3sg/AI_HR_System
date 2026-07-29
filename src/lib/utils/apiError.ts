import { AxiosError } from 'axios';

interface ClientApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Extracts a human-readable error message from a failed axios request made
 * against this app's own `/api/*` Route Handlers (client-side use only).
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ClientApiErrorBody | undefined;
    if (data?.message) {
      return data.message;
    }
    if (data?.errors) {
      const [firstField] = Object.keys(data.errors);
      const firstMessage = firstField ? data.errors[firstField]?.[0] : undefined;
      if (firstMessage) {
        return firstMessage;
      }
    }
  }
  return fallback;
}
