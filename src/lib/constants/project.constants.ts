import type { UserRole } from '@/types/domain.types';

/**
 * Project-related constants shared between Route Handlers, `proxy.ts`,
 * `routeAccess.ts`, and the Project domain's forms/hooks.
 */

/**
 * Roles allowed to view/create/edit/delete projects. This is a
 * frontend UX-level gate only (per the Technical Requirements' RBAC
 * section, "frontend role checks are UX-only"): the
 * `docs/HR_System_BE.postman_collection.json` `/Project/*` endpoints are
 * tagged only `[Auth]` (no role restriction), so the backend does not
 * itself enforce this restriction today. It is applied here because
 * "Manage Projects" is an administrative feature per the wireframe
 * (`docs/HR_System_FE_wireframe.pdf` shows the Projects nav item to both
 * a `ProjectAdmin` and a `SystemAdmin` demo user).
 */
export const PROJECT_MANAGEMENT_ROLES: readonly UserRole[] = ['SystemAdmin', 'ProjectAdmin'];

/** Routes gated by `PROJECT_MANAGEMENT_ROLES` in `routeAccess.ts`/`proxy.ts`. */
export const PROJECT_MANAGEMENT_ROUTES = ['/projects'];

/** Matches the wireframe's "Unique, uppercase letters and hyphens" project code hint. */
export const PROJECT_CODE_REGEX = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

/** Reasonable upper bound for a single resource's billable hours in a day. */
export const MAX_DAILY_HOURS_LIMIT = 24;
