/**
 * Auth-related constants shared between Route Handlers, `proxy.ts`, and the
 * server-only cookie helpers. Kept in one place so cookie names/lifetimes
 * never drift between the places that set/read them.
 */

export const ACCESS_TOKEN_COOKIE = 'hr_access_token';
export const REFRESH_TOKEN_COOKIE = 'hr_refresh_token';

/** Fallback max-age (seconds) used if the backend does not return ExpiresIn. */
export const DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;

/** Refresh tokens are long-lived; 7 days is a reasonable, common default. */
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * `/admin/users` (matches `resolveRouteAccess`'s prefix check, so this also
 * covers `/admin/users/create` and any future `/admin/users/*` sub-route).
 */
export const SYSTEM_ADMIN_ONLY_ROUTES = ['/admin/users'];

export const PUBLIC_ROUTES = ['/login'];
