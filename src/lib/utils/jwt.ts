import 'server-only';

import { decodeJwt } from 'jose';
import type { UserRole } from '@/types/domain.types';

/**
 * Server-only JWT helpers used by Route Handlers and `proxy.ts`.
 *
 * IMPORTANT: `decodeJwt` performs **no signature verification** - it only
 * base64-decodes the payload. That is intentional here: the frontend does
 * not hold the backend's signing key, so it cannot cryptographically verify
 * the token. These claims are only ever used for *optimistic* UX-level
 * checks (e.g. redirecting an unauthenticated user away from a protected
 * page, or pre-empting an obviously-unauthorized request before it reaches
 * the backend). The backend independently validates the token's signature
 * and role on every request and remains the actual authorization boundary,
 * per the RBAC section of the Technical Requirements doc.
 */

/** Common claim keys .NET/JWT providers use for the role claim. */
const ROLE_CLAIM_KEYS = [
  'role',
  'Role',
  'roles',
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role',
];

export interface DecodedAccessTokenClaims {
  sub?: string;
  exp?: number;
  iat?: number;
  [claim: string]: unknown;
}

export function decodeAccessToken(token: string): DecodedAccessTokenClaims | null {
  try {
    return decodeJwt(token) as DecodedAccessTokenClaims;
  } catch {
    return null;
  }
}

export function extractRole(claims: DecodedAccessTokenClaims | null): UserRole | null {
  if (!claims) return null;
  for (const key of ROLE_CLAIM_KEYS) {
    const value = claims[key];
    if (typeof value === 'string') {
      return value as UserRole;
    }
    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0] as UserRole;
    }
  }
  return null;
}

export function isTokenExpired(claims: DecodedAccessTokenClaims | null): boolean {
  if (!claims?.exp) return true;
  return Date.now() >= claims.exp * 1000;
}

/**
 * Seconds remaining until the token's own `exp` claim, for use as the auth
 * cookie's max-age. This is the token's cryptographically authoritative
 * expiry - safer to rely on than a separate `ExpiresAt` field the backend
 * response body may report, since that field isn't guaranteed to agree with
 * the JWT it accompanies.
 */
export function secondsUntilExpiry(claims: DecodedAccessTokenClaims | null): number | undefined {
  if (!claims?.exp) return undefined;
  return Math.max(0, claims.exp - Math.floor(Date.now() / 1000));
}
