import { SYSTEM_ADMIN_ONLY_ROUTES } from '@/lib/constants/auth.constants';
import type { UserRole } from '@/types/domain.types';

export type RouteAccessDecision =
  | { type: 'allow' }
  | { type: 'refresh' }
  | { type: 'redirect'; destination: 'login' | 'forbidden' };

export interface RouteAccessInput {
  pathname: string;
  hasAccessToken: boolean;
  isAccessTokenExpired: boolean;
  hasRefreshToken: boolean;
  role: UserRole | null;
}

function requiresSystemAdmin(pathname: string): boolean {
  return SYSTEM_ADMIN_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Pure decision function used by `proxy.ts` to decide how to handle a
 * request to a protected route, kept side-effect-free so it can be unit
 * tested without constructing real `NextRequest`/`NextResponse` objects.
 *
 * - `allow`: a valid, non-expired access token is present and (if the
 *   route is SystemAdmin-only) the decoded role matches.
 * - `refresh`: the access token is missing/expired but a refresh token is
 *   present, so `proxy.ts` should attempt a silent token refresh before
 *   re-evaluating.
 * - `redirect`: the caller has no way to become authorized on this
 *   request (no refresh token, or an authenticated-but-wrong-role user
 *   hitting a SystemAdmin-only route).
 */
export function resolveRouteAccess(input: RouteAccessInput): RouteAccessDecision {
  if (!input.hasAccessToken || input.isAccessTokenExpired) {
    if (input.hasRefreshToken) {
      return { type: 'refresh' };
    }
    return { type: 'redirect', destination: 'login' };
  }

  if (requiresSystemAdmin(input.pathname) && input.role !== 'SystemAdmin') {
    return { type: 'redirect', destination: 'forbidden' };
  }

  return { type: 'allow' };
}
