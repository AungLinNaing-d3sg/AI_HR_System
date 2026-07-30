import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
  /**
   * Extra classes for the outer positioning `<div>` (e.g. to constrain a
   * standalone `min-w-[Xrem]` control). Rarely needed - `className` on the
   * `<select>` itself (e.g. `w-auto`) is enough for existing call sites,
   * since the wrapper naturally hugs the select's own width.
   */
  wrapperClassName?: string;
}

/**
 * Native `<select>` wrapped in a relatively-positioned `<div>` so a
 * decorative chevron can be layered on top of `appearance-none`, matching
 * the flat/modern look of `Input`/`Button` instead of each browser's default
 * (and visually inconsistent) select affordance. Purely presentational -
 * the element is still a real `<select>`, so native keyboard/assistive-tech
 * behavior, `className` overrides, and existing call sites are unchanged.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, hasError, children, ...props }, ref) => {
    return (
      <div className={cn('relative', wrapperClassName)}>
        <select
          ref={ref}
          className={cn(
            'flex h-10 w-full appearance-none rounded-md border bg-white py-2 pl-3 pr-9 text-sm text-zinc-900 shadow-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
            hasError
              ? 'border-red-500 focus-visible:ring-red-500'
              : 'border-zinc-300 hover:border-zinc-400 focus-visible:ring-zinc-900',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-zinc-300',
            className
          )}
          aria-invalid={hasError || undefined}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
          aria-hidden="true"
        />
      </div>
    );
  }
);
Select.displayName = 'Select';
