import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, hasError, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          hasError
            ? 'border-red-500 focus-visible:ring-red-500'
            : 'border-zinc-300 focus-visible:ring-zinc-900',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        aria-invalid={hasError || undefined}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';
