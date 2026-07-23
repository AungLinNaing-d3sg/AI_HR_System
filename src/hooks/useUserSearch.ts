'use client';

import { useQuery } from '@tanstack/react-query';
import * as authApi from '@/lib/api/auth.api';
import { MIN_USER_SEARCH_QUERY_LENGTH } from '@/lib/constants/user.constants';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { UserListItem } from '@/types/domain.types';

/**
 * Stable empty-array reference returned while the query is disabled/loading
 * - a fresh `[]` literal on every render would change identity each time,
 * defeating callers (like `UserSearchCombobox`) that reset UI state (e.g.
 * the highlighted option index) only when the `users` result actually
 * changes.
 */
const EMPTY_USERS: UserListItem[] = [];

/**
 * Free-text search for the "Add User to Project" combobox on
 * `/projects/:id/assignments` (`UserSearchCombobox`), sourced from
 * `GET /Auth/SearchUsers?email={query}&userName={query}` (see
 * `app/api/auth/search-users/route.ts`), replacing the previously used
 * `useUserList`/`GET /Auth/GetUserList` dropdown. `query` is expected to
 * already be debounced by the caller (see `useDebounce`) - this hook only
 * adds the "don't search on too-short input" gate, disabling the query
 * entirely below `MIN_USER_SEARCH_QUERY_LENGTH` so the combobox never fires
 * an overly broad request while the user is still typing the first
 * character. Query key is scoped by the trimmed search text so each
 * distinct search gets its own cache entry.
 */
export function useUserSearch(query: string) {
  const trimmedQuery = query.trim();
  const enabled = trimmedQuery.length >= MIN_USER_SEARCH_QUERY_LENGTH;

  const searchQuery = useQuery({
    queryKey: ['auth', 'search-users', trimmedQuery],
    queryFn: () => authApi.searchUsers(trimmedQuery),
    enabled,
  });

  return {
    users: enabled ? (searchQuery.data ?? EMPTY_USERS) : EMPTY_USERS,
    isLoading: enabled && searchQuery.isLoading,
    isFetching: enabled && searchQuery.isFetching,
    isError: enabled && searchQuery.isError,
    error: enabled && searchQuery.error ? getApiErrorMessage(searchQuery.error, 'Could not search for users.') : null,
  };
}
