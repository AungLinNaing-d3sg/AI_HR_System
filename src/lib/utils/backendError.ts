import 'server-only';

import { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

export interface BackendErrorDetails {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

/**
 * The shape ASP.NET Core's own `[ApiController]` automatic model
 * validation returns - this is NOT this app's `{StatusCode, IsSuccess,
 * Message, Data}` envelope, because it never reaches the controller/
 * envelope at all. A malformed request body (e.g. `RoleId` that isn't a
 * valid GUID) fails during JSON deserialization itself, before any
 * business logic runs, and the framework's default `ProblemDetails`
 * response comes back instead: `{title, status, errors: {field: [msg]}}`
 * with a lowercase `errors`, unlike our own PascalCase `Errors`.
 */
interface AspNetProblemDetails {
  title?: string;
  errors?: Record<string, string[]>;
}

function firstMessage(errors: Record<string, string[]> | undefined): string | undefined {
  if (!errors) return undefined;
  for (const messages of Object.values(errors)) {
    if (Array.isArray(messages) && typeof messages[0] === 'string') {
      return messages[0];
    }
  }
  return undefined;
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
    const data = error.response?.data as (ApiErrorResponse & AspNetProblemDetails) | undefined;

    if (data?.Message) {
      return { status, message: data.Message, errors: data.Errors };
    }

    // Fall back to ASP.NET's raw ProblemDetails shape (see above) so a
    // genuine backend validation reason still reaches the user instead of
    // silently collapsing into the generic fallback message.
    const problemMessage = firstMessage(data?.errors) ?? data?.title;
    if (problemMessage) {
      return { status, message: problemMessage, errors: data?.errors ?? data?.Errors };
    }

    return { status, message: fallback, errors: data?.Errors };
  }
  return { status: 500, message: fallback };
}

/**
 * Same normalization as `getBackendErrorDetails`, but for requests made with
 * `responseType: 'arraybuffer'` (see `reportsBackend.api.ts`'s export
 * functions, used by the Report domain's "export" Route Handlers under
 * `app/api/reports`). On a real error the backend still replies with its
 * usual `{StatusCode, IsSuccess, Message, Data}` JSON envelope, but axios
 * hands it back as raw bytes instead of an already-parsed object (since the
 * request itself asked for binary), so the envelope's `Message` has to be
 * decoded off the buffer first before falling back to
 * `getBackendErrorDetails`'s normal handling.
 */
export function getBackendFileErrorDetails(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): BackendErrorDetails {
  if (error instanceof AxiosError && error.response?.data instanceof ArrayBuffer) {
    try {
      const decoded = Buffer.from(error.response.data).toString('utf-8');
      const parsed = JSON.parse(decoded) as ApiErrorResponse;
      if (parsed.Message) {
        return { status: error.response.status, message: parsed.Message, errors: parsed.Errors };
      }
    } catch {
      // The response body wasn't JSON (e.g. a genuinely corrupted file) -
      // fall through to the generic handling below instead of throwing.
    }
  }
  return getBackendErrorDetails(error, fallback);
}
