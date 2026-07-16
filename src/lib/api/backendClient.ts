import 'server-only';

import axios from 'axios';
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
