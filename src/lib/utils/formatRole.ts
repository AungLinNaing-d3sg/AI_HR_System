import type { UserRole } from '@/types/domain.types';

/** "SystemAdmin" -> "System Admin" for display, matching the wireframe's spaced role labels. */
export function formatRole(role: UserRole): string {
  return role.replace(/([a-z])([A-Z])/g, '$1 $2');
}
