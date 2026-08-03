'use client';

import { useQuery } from '@tanstack/react-query';
import * as authApi from '@/lib/api/auth.api';
import { MIN_USER_SEARCH_QUERY_LENGTH } from '@/lib/constants/user.constants';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { UserListItem } from '@/types/domain.types';

/**
 * Stable empty-array reference returned while the query is loading - a
 * fresh `[]` literal on every render would change identity each time,
 * defeating callers (like `UserSearchCombobox`) that reset UI state (e.g.
 * the highlighted option index) only when the `users` result actually
 * changes.
 */
const EMPTY_USERS: UserListItem[] = [];

/**
 * Free-text search backing the searchable "Add User to Project" combobox on
 * `/projects/:id/assignments` (`UserSearchCombobox`), sourced entirely from
 * `GET /Auth/SearchUsers?email={query}&userName={query}` (see
 * `app/api/auth/search-users/route.ts`) - this is now the combobox's *only*
 * data source, including its initial, pre-search candidate list (previously
 * a separate `GET /Auth/GetUserList` call via the now-removed `useUserList`/
 * `/api/auth/user-list`), since the backend supports calling `SearchUsers`
 * with neither param to return that same broad/unfiltered list. `query` is
 * expected to already be debounced by the caller (see `useDebounce`).
 *
 * Below `MIN_USER_SEARCH_QUERY_LENGTH`, the *request* sent to the backend is
 * pinned to an empty string regardless of the (too-short) input - so the
 * combobox never fires an overly narrow 1-character search - while the
 * `queryKey` collapses to that same `''` entry, meaning every call made
 * below the threshold (including `UserSearchCombobox`'s own always-on tier-1
 * call) shares one cached, unfiltered result instead of issuing a fresh
 * request per keystroke.
 */
export function useUserSearch(query: string) {
  const trimmedQuery = query.trim();
  const isServerFiltered = trimmedQuery.length >= MIN_USER_SEARCH_QUERY_LENGTH;
  const effectiveQuery = isServerFiltered ? trimmedQuery : '';

  const searchQuery = useQuery({
    queryKey: ['auth', 'search-users', effectiveQuery],
    queryFn: () => authApi.searchUsers(effectiveQuery),
  });

  return {
    users: searchQuery.data ?? EMPTY_USERS,
    isLoading: searchQuery.isLoading,
    isFetching: searchQuery.isFetching,
    isError: searchQuery.isError,
    error: searchQuery.error ? getApiErrorMessage(searchQuery.error, 'Could not search for users.') : null,
  };
}
