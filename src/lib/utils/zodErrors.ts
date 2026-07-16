import type { z } from 'zod';

/**
 * Converts a Zod validation failure into the `Record<string, string[]>`
 * field-error shape used across this app's Route Handler error responses
 * (and understood client-side by `getApiErrorMessage`).
 */
export function zodErrorToFieldErrors<T>(error: z.ZodError<T>): Record<string, string[]> {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const result: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) {
      result[field] = messages;
    }
  }
  return result;
}
