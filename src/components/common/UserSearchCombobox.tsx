'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useUserSearch } from '@/hooks/useUserSearch';
import { MIN_USER_SEARCH_QUERY_LENGTH, USER_SEARCH_DEBOUNCE_MS } from '@/lib/constants/user.constants';
import { cn } from '@/lib/utils/cn';
import type { UserListItem } from '@/types/domain.types';

export interface UserSearchComboboxProps {
  id: string;
  /** The selected user's `userId`, or `''` when nothing is selected yet. */
  value: string;
  onChange: (userId: string) => void;
  onBlur?: () => void;
  hasError?: boolean;
  disabled?: boolean;
  placeholder?: string;
  'aria-describedby'?: string;
}

function userLabel(user: UserListItem): string {
  return `${user.firstName} ${user.lastName} (${user.email})`;
}

/**
 * Searchable "Add User to Project" combobox on `/projects/:id/assignments`
 * (`ProjectAssignmentsPanel`), replacing the plain `<Select>` populated from
 * `useUserList`/`GET /Auth/GetUserList`. As the user types, the query is
 * debounced (`useDebounce`, `USER_SEARCH_DEBOUNCE_MS`) and sent to
 * `GET /Auth/SearchUsers?email={q}&userName={q}` via `useUserSearch` once it
 * reaches `MIN_USER_SEARCH_QUERY_LENGTH`. Implements the WAI-ARIA
 * "combobox with listbox popup" pattern using `aria-activedescendant` -
 * options are plain, non-focusable `li` elements, with `onMouseDown`
 * prevented so a mouse click never blurs (and thus never closes/unmounts)
 * the listbox before the click itself is handled, keeping keyboard and
 * mouse selection consistent.
 *
 * Controlled like a form field: `value` is the selected user's `userId` (for
 * `zodResolver`/`assignResourceSchema` to validate), while the visible input
 * text is tracked internally and only resynced from `value` when it changes
 * *externally* (e.g. `reset()` after a successful submit) rather than from
 * this component's own `onChange` calls - see the `lastEmittedValue`
 * comparison below (React's "adjust state during render" pattern, since refs
 * cannot be read/written during render).
 */
export function UserSearchCombobox({
  id,
  value,
  onChange,
  onBlur,
  hasError,
  disabled,
  placeholder = 'Search by name or email…',
  'aria-describedby': ariaDescribedBy,
}: UserSearchComboboxProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [lastEmittedValue, setLastEmittedValue] = useState(value);
  const listRef = useRef<HTMLUListElement>(null);

  const debouncedQuery = useDebounce(inputValue, USER_SEARCH_DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();
  const { users, isLoading, isFetching, isError, error } = useUserSearch(trimmedQuery);

  const showListbox = isOpen && trimmedQuery.length >= MIN_USER_SEARCH_QUERY_LENGTH;
  const listboxId = `${id}-listbox`;

  // Resync the visible text only when `value` changed externally (e.g. this
  // form's `reset()` after a successful assignment) - not in response to
  // this component's own `onChange(userId)`/`onChange('')` calls, which
  // already keep `lastEmittedValue` in step with `value`. Adjusting state
  // during render (React's documented alternative to an effect for this
  // exact "derived from a prop change" case) avoids the extra
  // render-then-effect round trip a `useEffect` would add here.
  if (value !== lastEmittedValue) {
    setLastEmittedValue(value);
    if (value === '' && inputValue !== '') {
      setInputValue('');
    }
  }

  // Reset the highlighted option whenever the (debounced) search text
  // changes, since the previous highlight index no longer corresponds to a
  // meaningful option once the result set is about to change.
  const [previousQuery, setPreviousQuery] = useState(trimmedQuery);
  if (trimmedQuery !== previousQuery) {
    setPreviousQuery(trimmedQuery);
    if (activeIndex !== -1) {
      setActiveIndex(-1);
    }
  }

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const option = listRef.current.children[activeIndex] as HTMLElement | undefined;
    // jsdom (used by the Jest test environment) doesn't implement
    // `scrollIntoView`, so guard its presence rather than assuming a real
    // browser DOM.
    if (typeof option?.scrollIntoView === 'function') {
      option.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  function emitSelection(userId: string) {
    setLastEmittedValue(userId);
    onChange(userId);
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const text = event.target.value;
    setInputValue(text);
    setIsOpen(true);
    if (lastEmittedValue !== '') {
      emitSelection('');
    }
  }

  function handleSelect(user: UserListItem) {
    setInputValue(userLabel(user));
    setIsOpen(false);
    setActiveIndex(-1);
    emitSelection(user.userId);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showListbox || users.length === 0) {
      if (event.key === 'ArrowDown' && trimmedQuery.length >= MIN_USER_SEARCH_QUERY_LENGTH) {
        setIsOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % users.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((current) => (current <= 0 ? users.length - 1 : current - 1));
        break;
      case 'Enter':
        if (activeIndex >= 0 && activeIndex < users.length) {
          event.preventDefault();
          handleSelect(users[activeIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  }

  function handleBlur() {
    setIsOpen(false);
    onBlur?.();
  }

  const activeOptionId =
    activeIndex >= 0 && activeIndex < users.length ? `${id}-option-${activeIndex}` : undefined;

  return (
    <div className="relative">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          aria-hidden="true"
        />
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={showListbox}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-invalid={hasError || undefined}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex h-10 w-full rounded-md border bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 shadow-sm',
            'placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
            hasError
              ? 'border-red-500 focus-visible:ring-red-500'
              : 'border-zinc-300 focus-visible:ring-zinc-900',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        />
      </div>

      {trimmedQuery.length > 0 && trimmedQuery.length < MIN_USER_SEARCH_QUERY_LENGTH && (
        <p className="mt-1 text-xs text-zinc-500">
          Type at least {MIN_USER_SEARCH_QUERY_LENGTH} characters to search.
        </p>
      )}

      {showListbox && (
        <ul
          id={listboxId}
          ref={listRef}
          role="listbox"
          aria-label="Matching users"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {isLoading || isFetching ? (
            <li className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500" aria-live="polite">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Searching…
            </li>
          ) : isError ? (
            <li className="px-3 py-2 text-sm text-red-600" role="alert">
              {error ?? 'Could not search for users.'}
            </li>
          ) : users.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500">No users found matching “{trimmedQuery}”.</li>
          ) : (
            users.map((user, index) => (
              <li
                key={user.userId}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={value === user.userId}
                onMouseEnter={() => setActiveIndex(index)}
                // A plain, non-focusable `li` wouldn't normally steal focus
                // from the input on click - but a browser's default
                // mousedown behavior still shifts `document.activeElement`
                // (blurring the input) before the click fires, which would
                // close the listbox mid-click and unmount this very option.
                // Preventing default on mousedown keeps the input focused
                // throughout, so the subsequent `onClick` reaches it.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(user)}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm text-zinc-900',
                  index === activeIndex ? 'bg-zinc-100' : 'hover:bg-zinc-50'
                )}
              >
                <span className="font-medium">
                  {user.firstName} {user.lastName}
                </span>
                <span className="ml-1 text-zinc-500">({user.email})</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
