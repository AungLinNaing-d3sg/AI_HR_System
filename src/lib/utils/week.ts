/**
 * Pure, timezone-safe date-string helpers for the `/timesheets` weekly grid.
 * Every date is represented as a plain `YYYY-MM-DD` string and always parsed/
 * formatted against UTC midnight, so the "calendar day" a hover/edit refers
 * to never shifts depending on the server's or browser's local timezone.
 */

const DATE_STRING_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/**
 * Returns `date`'s calendar day (`YYYY-MM-DD`) as perceived in the caller's
 * OWN local timezone (`getFullYear`/`getMonth`/`getDate`, not UTC). This is
 * deliberately different from `toDateOnly`/`parseDateOnly` above, which are
 * UTC-anchored so an *explicit* `YYYY-MM-DD` date string always means the
 * same instant everywhere - `getLocalDateString` instead answers "what
 * calendar day is it *for this user, right now*", which is what "today"
 * needs to mean when defaulting the weekly grid or enforcing the
 * one-entry-per-local-calendar-day rule (see
 * `app/api/timesheets/entries/route.ts`). Without this, a user just after
 * local midnight in a timezone ahead of UTC (e.g. UTC+8) would have "today"
 * resolved against the *previous* UTC day.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** True for a syntactically valid, real `YYYY-MM-DD` calendar date. */
export function isValidDateString(value: string): boolean {
  if (!DATE_STRING_PATTERN.test(value)) return false;
  const parsed = parseDateOnly(value);
  return !Number.isNaN(parsed.getTime()) && toDateOnly(parsed) === value;
}

/** Adds (or subtracts, for a negative `amount`) whole days to a `YYYY-MM-DD` date string. */
export function addDays(date: string, amount: number): string {
  const parsed = parseDateOnly(date);
  parsed.setUTCDate(parsed.getUTCDate() + amount);
  return toDateOnly(parsed);
}

/**
 * Returns the Monday (`YYYY-MM-DD`) of the ISO week containing `date`. When
 * `date` is omitted, "today" is resolved via `getLocalDateString` (the
 * caller's own local calendar day), not UTC - so the weekly grid's default
 * week, "This week" button, and same-day submission checks all agree with
 * what the user's own clock says "today" is, even close to local midnight.
 * An explicitly-passed `date` (e.g. jumping to a specific entry's week) is
 * still resolved via the UTC-anchored `toDateOnly`/`parseDateOnly` helpers
 * above, since that's an unambiguous calendar date, not "now".
 */
export function getMondayOfWeek(date?: Date): string {
  const dateString = date ? toDateOnly(date) : getLocalDateString();
  const parsed = parseDateOnly(dateString);
  const day = parsed.getUTCDay(); // 0 (Sun) .. 6 (Sat)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDays(dateString, diffToMonday);
}

/** The 7 `YYYY-MM-DD` dates (Monday first) of the week starting on `weekStart`. */
export function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

/** Short weekday + "Mon D" label pair used for the grid's column headers. */
export function formatDayHeader(date: string): { weekday: string; monthDay: string } {
  const parsed = parseDateOnly(date);
  const weekday = parsed.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const monthDay = parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return { weekday, monthDay };
}

/** Full accessible label for a single day, e.g. "Mon, Feb 24" - used in cell `aria-label`s. */
export function formatDayLabel(date: string): string {
  const { weekday, monthDay } = formatDayHeader(date);
  return `${weekday}, ${monthDay}`;
}

/** Human-readable "Feb 24 – Mar 2, 2025" label for the week starting on `weekStart`. */
export function formatWeekRangeLabel(weekStart: string): string {
  const weekEnd = addDays(weekStart, 6);
  const startLabel = parseDateOnly(weekStart).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const endLabel = parseDateOnly(weekEnd).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `${startLabel} – ${endLabel}`;
}
