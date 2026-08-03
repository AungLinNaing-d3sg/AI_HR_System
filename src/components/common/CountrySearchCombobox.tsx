'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useCountries } from '@/hooks/useCountries';
import { cn } from '@/lib/utils/cn';
import type { Country } from '@/types/domain.types';

export interface CountrySearchComboboxProps {
  id: string;
  /** The selected country's `id`, or `''` when nothing is selected yet. */
  value: string;
  onChange: (countryId: string) => void;
  onBlur?: () => void;
  hasError?: boolean;
  disabled?: boolean;
  placeholder?: string;
  'aria-describedby'?: string;
}

function countryLabel(country: Country): string {
  return `${country.name} (${country.code})`;
}

/** Case-insensitive match against a country's name or ISO code. */
function matchesQuery(country: Country, query: string): boolean {
  const needle = query.toLowerCase();
  return country.name.toLowerCase().includes(needle) || country.code.toLowerCase().includes(needle);
}

/**
 * Searchable "Country" combobox on the Create User form (`CreateUserForm`)
 * and the `/admin/users` row-level Edit form (`UserEditForm`), replacing the
 * previous plain `<Select>` dropdown on both. Implements the same
 * WAI-ARIA "combobox with listbox popup" pattern (`aria-activedescendant`,
 * non-focusable `li` options with `onMouseDown` prevented so a mouse click
 * never blurs/closes the listbox before it's handled) as the "Add User to
 * Project" `UserSearchCombobox` on `/projects/:id/assignments`, for a
 * consistent search-as-you-type experience across the app.
 *
 * Every configured country (`useCountries`/`GET /api/countries`, one large
 * unpaginated page - see that hook's doc comment) is shown as soon as the
 * field is opened, then filtered client-side by name or ISO code as the
 * caller types. Unlike `UserSearchCombobox`, there is no second,
 * server-backed search tier: `Country/GetAllCountries` has no free-text
 * search query param (see docs/HR_System_BE.postman_collection.json), and
 * the reference list is small enough that purely local filtering is
 * sufficient and avoids firing a network request on every keystroke.
 *
 * Controlled like a form field: `value` is the selected country's `id` (for
 * `zodResolver`/`createUserSchema` to validate), while the visible input
 * text is tracked internally and only resynced from `value` when it changes
 * *externally* (e.g. `reset()` after a successful submit) rather than from
 * this component's own `onChange` calls - see `UserSearchCombobox`'s doc
 * comment for why this "adjust state during render" pattern is used instead
 * of a `useEffect`.
 */
export function CountrySearchCombobox({
  id,
  value,
  onChange,
  onBlur,
  hasError,
  disabled,
  placeholder = 'Search for a country…',
  'aria-describedby': ariaDescribedBy,
}: CountrySearchComboboxProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [lastEmittedValue, setLastEmittedValue] = useState(value);
  const listRef = useRef<HTMLUListElement>(null);
  // Only relevant for a caller that mounts with a non-empty `value` (e.g.
  // `UserEditForm`, pre-filling an existing user's country) - `CreateUserForm`
  // always starts empty, so this never fires there.
  const [hasSyncedInitialValue, setHasSyncedInitialValue] = useState(false);
  // `true` for the brief window where `inputValue` shows the pre-filled
  // selection's label (see the sync effect below) but the caller hasn't
  // typed anything yet - so opening the listbox shows every country (like
  // the empty-query state) instead of filtering by that label text, which
  // would otherwise match nothing (a country's name never contains its own
  // "Name (CODE)" display label). Cleared on the first keystroke.
  const [isPrefilledDisplayOnly, setIsPrefilledDisplayOnly] = useState(false);

  const { countries, isLoading, isError, error } = useCountries();

  // Once the country list has loaded, show the currently selected country's
  // label in the input - otherwise a caller that mounts with a pre-selected
  // `value` (unlike `CreateUserForm`, which always starts blank) would show
  // an empty input despite a country already being chosen. Runs once; later
  // selections/clears are already tracked via `lastEmittedValue`/`onChange`.
  // Adjusting state during render (rather than a `useEffect`) is React's
  // documented alternative for this "derived from a prop/query change" case
  // - see `UserSearchCombobox`'s doc comment for the same pattern - and
  // avoids an extra render-then-effect round trip.
  if (!hasSyncedInitialValue && !isLoading) {
    setHasSyncedInitialValue(true);
    const selected = value ? countries.find((country) => country.id === value) : undefined;
    if (selected) {
      setInputValue(countryLabel(selected));
      setLastEmittedValue(value);
      setIsPrefilledDisplayOnly(true);
    }
  }

  const trimmedQuery = inputValue.trim();
  const matches = useMemo(
    () =>
      trimmedQuery.length === 0 || isPrefilledDisplayOnly
        ? countries
        : countries.filter((country) => matchesQuery(country, trimmedQuery)),
    [countries, trimmedQuery, isPrefilledDisplayOnly]
  );

  const showListbox = isOpen;
  const listboxId = `${id}-listbox`;

  // Resync the visible text only when `value` changed externally - not in
  // response to this component's own `onChange` calls, which already keep
  // `lastEmittedValue` in step with `value`.
  if (value !== lastEmittedValue) {
    setLastEmittedValue(value);
    if (value === '' && inputValue !== '') {
      setInputValue('');
    }
  }

  // Reset the highlighted option whenever the query changes, since the
  // previous highlight index no longer corresponds to a meaningful option
  // once the result set is about to change.
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

  function emitSelection(countryId: string) {
    setLastEmittedValue(countryId);
    onChange(countryId);
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const text = event.target.value;
    setInputValue(text);
    setIsOpen(true);
    setIsPrefilledDisplayOnly(false);
    if (lastEmittedValue !== '') {
      emitSelection('');
    }
  }

  function handleSelect(country: Country) {
    setInputValue(countryLabel(country));
    setIsOpen(false);
    setActiveIndex(-1);
    emitSelection(country.id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showListbox || matches.length === 0) {
      // Reopens the listbox (e.g. after it was dismissed via Escape while
      // the input stayed focused) - it always has *something* to show once
      // open, since the empty-query state is the full country list.
      if (event.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % matches.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((current) => (current <= 0 ? matches.length - 1 : current - 1));
        break;
      case 'Enter':
        if (activeIndex >= 0 && activeIndex < matches.length) {
          event.preventDefault();
          handleSelect(matches[activeIndex]);
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
    activeIndex >= 0 && activeIndex < matches.length ? `${id}-option-${activeIndex}` : undefined;

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

      {showListbox && (
        <ul
          id={listboxId}
          ref={listRef}
          role="listbox"
          aria-label="Matching countries"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {isLoading ? (
            <li className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500" aria-live="polite">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Loading countries…
            </li>
          ) : isError ? (
            <li className="px-3 py-2 text-sm text-red-600" role="alert">
              {error ?? 'Could not load countries.'}
            </li>
          ) : matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500">
              {trimmedQuery.length > 0 ? `No countries found matching “${trimmedQuery}”.` : 'No countries available.'}
            </li>
          ) : (
            matches.map((country, index) => (
              <li
                key={country.id}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={value === country.id}
                onMouseEnter={() => setActiveIndex(index)}
                // A plain, non-focusable `li` wouldn't normally steal focus
                // from the input on click - but a browser's default
                // mousedown behavior still shifts `document.activeElement`
                // (blurring the input) before the click fires, which would
                // close the listbox mid-click and unmount this very option.
                // Preventing default on mousedown keeps the input focused
                // throughout, so the subsequent `onClick` reaches it.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(country)}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm text-zinc-900',
                  index === activeIndex ? 'bg-zinc-100' : 'hover:bg-zinc-50'
                )}
              >
                <span className="font-medium">{country.name}</span>
                <span className="ml-1 text-zinc-500">({country.code})</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
