import 'server-only';

import axios, { AxiosError } from 'axios';
import https from 'node:https';

/**
 * Server-only Axios instance that talks directly to the .NET backend
 * (see docs/HR_System_BE.postman_collection.json, base `https://localhost:7195`).
 *
 * This is intentionally never imported by client components/hooks - the
 * backend only trusts a `Authorization: Bearer <token>` header, and the
 * access token lives in an httpOnly cookie the browser cannot read. Only
 * `lib/api/authBackend.api.ts` (consumed by Route Handlers and `proxy.ts`)
 * is allowed to use this client; the browser instead calls this app's own
 * `/api/*` Route Handlers via `lib/api/axios.ts`.
 */

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? 'https://localhost:7195/api/v1';

/**
 * Local .NET dev servers commonly run behind a self-signed HTTPS
 * certificate. Certificate validation is only relaxed when this flag is
 * explicitly set (never implied by `NODE_ENV`), so a misconfigured
 * production deployment can't silently downgrade TLS security.
 */
const allowInsecureTls = process.env.BACKEND_ALLOW_INSECURE_TLS === 'true';

export const backendClient = axios.create({
  baseURL: BACKEND_API_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
  httpsAgent: allowInsecureTls ? new https.Agent({ rejectUnauthorized: false }) : undefined,
});

/**
 * The backend wraps every response in a `{StatusCode, IsSuccess, Message,
 * Data}` envelope, and reports business-rule failures (wrong current
 * password, duplicate username, etc.) as an HTTP 200 with `IsSuccess: false`
 * rather than a 4xx status - the real intended status travels in the
 * envelope's own `StatusCode` field instead. Axios only rejects on non-2xx
 * responses, so without this check an `IsSuccess: false` response would
 * resolve exactly like a real success (this was the root cause of Change
 * Password reporting success on a wrong current password, and Create User
 * crashing on a null `Data` instead of surfacing the backend's validation
 * message). Throwing an `AxiosError` here for `IsSuccess: false` lets every
 * `*Backend.api.ts` caller and `getBackendErrorDetails` handle it exactly
 * like any other backend error, uniformly across every endpoint.
 *
 * For a true success, unwrapping the envelope here means every
 * `*Backend.api.ts` function can keep returning `response.data` and get the
 * real payload directly, instead of every call site having to know about
 * the envelope.
 */
backendClient.interceptors.response.use((response) => {
  const body: unknown = response.data;
  if (body && typeof body === 'object' && 'IsSuccess' in body) {
    const envelope = body as { IsSuccess: boolean; Message?: string; StatusCode?: number; Data?: unknown };

    if (envelope.IsSuccess === false) {
      const status = typeof envelope.StatusCode === 'number' && envelope.StatusCode !== 200
        ? envelope.StatusCode
        : 400;
      throw new AxiosError(
        envelope.Message || 'The request could not be completed.',
        AxiosError.ERR_BAD_RESPONSE,
        response.config,
        response.request,
        { ...response, status, data: body }
      );
    }

    if ('Data' in envelope) {
      response.data = envelope.Data;
    }
  }
  return response;
});
