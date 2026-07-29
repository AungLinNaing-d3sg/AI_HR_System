/**
 * Pure date-range helpers backing the Report domain's filter bars, which
 * (per `docs/HR_System_FE_wireframe.pdf`'s `/reports/*` screens) all default
 * to the current calendar month rather than an empty/unbounded range - the
 * backend's `Report/Generate*` endpoints require `startDate`/`endDate` (or
 * `year`/`month`) on every call, so an empty default is not an option.
 * Dates are always formatted against UTC midnight, matching the same
 * timezone-safe convention `lib/utils/week.ts` uses for the Timesheet grid.
 */

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** `{ from, to }` (`YYYY-MM-DD`) spanning the first through last day of `reference`'s month. */
export function getCurrentMonthDateRange(reference: Date = new Date()): { from: string; to: string } {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  const from = toDateOnly(new Date(Date.UTC(year, month, 1)));
  const to = toDateOnly(new Date(Date.UTC(year, month + 1, 0)));
  return { from, to };
}

/** `{ year, month }` (`month` is 1-12) for `reference`'s calendar month. */
export function getCurrentYearMonth(reference: Date = new Date()): { year: number; month: number } {
  return { year: reference.getUTCFullYear(), month: reference.getUTCMonth() + 1 };
}

/** Formats `{ year, month }` as the `YYYY-MM` string an `<input type="month">` expects/reports. */
export function toMonthInputValue(year: number, month: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

/** Parses an `<input type="month">`'s `YYYY-MM` value back into `{ year, month }`, or `null` if malformed. */
export function parseMonthInputValue(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}
