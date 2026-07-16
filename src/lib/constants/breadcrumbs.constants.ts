export interface Crumb {
  label: string;
  /** Omit for the current (last) crumb, which is never a link. */
  href?: string;
}

const DASHBOARD: Crumb = { label: 'Dashboard', href: '/dashboard' };
const PROJECTS: Crumb = { label: 'Projects', href: '/projects' };

const EDIT_PROJECT_PATTERN = /^\/projects\/[^/]+$/;

/**
 * Static pathname -> breadcrumb-trail mapping. Kept as an explicit lookup
 * rather than deriving labels generically from URL segments because several
 * routes (e.g. `/admin/users/create`) have intermediate segments
 * (`admin`, `users`) with no corresponding page to link to, and the dynamic
 * `/projects/[id]` segment needs a human label ("Edit"), not the raw id.
 */
export function getBreadcrumbs(pathname: string): Crumb[] {
  if (pathname === '/dashboard') return [{ label: 'Dashboard' }];
  if (pathname === '/profile') return [DASHBOARD, { label: 'My Account' }];
  if (pathname === '/projects') return [DASHBOARD, { label: 'Projects' }];
  if (pathname === '/projects/new') return [DASHBOARD, PROJECTS, { label: 'New Project' }];
  if (pathname === '/admin/users/create') return [DASHBOARD, { label: 'Create User' }];
  if (EDIT_PROJECT_PATTERN.test(pathname)) return [DASHBOARD, PROJECTS, { label: 'Edit' }];

  return [DASHBOARD];
}
