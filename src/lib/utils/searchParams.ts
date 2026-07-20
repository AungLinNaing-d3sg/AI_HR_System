/**
 * Reads a fixed set of keys off a `URLSearchParams` into a plain object,
 * omitting any key that is absent entirely - used by the `/api/reports/*`
 * Route Handlers so an omitted optional filter (e.g. `projectId`) is
 * `undefined` for Zod's `.optional()` rather than an empty string (which
 * would fail an `.optional()` schema that isn't also `.or(z.literal(''))`).
 */
export function pickSearchParams(searchParams: URLSearchParams, keys: readonly string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value !== null) {
      result[key] = value;
    }
  }
  return result;
}
