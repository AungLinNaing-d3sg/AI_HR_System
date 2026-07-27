export function getInitials(firstName: string, lastName: string): string {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim();
  return initials ? initials.toUpperCase() : '?';
}
