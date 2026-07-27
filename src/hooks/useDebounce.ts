'use client';

import { useEffect, useState } from 'react';

/**
 * Debounces a fast-changing value, only updating the returned value once
 * `delayMs` has elapsed without `value` changing again. Used by the
 * searchable "Add User to Project" combobox (`UserSearchCombobox`,
 * `useUserSearch`) on `/projects/:id/assignments` to throttle as-you-type
 * `GET /Auth/SearchUsers` calls, but is a generic, reusable primitive not
 * tied to that feature.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debouncedValue;
}
