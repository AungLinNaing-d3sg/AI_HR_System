import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm',
          'placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          hasError
            ? 'border-red-500 focus-visible:ring-red-500'
            : 'border-zinc-300 focus-visible:ring-zinc-900',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        aria-invalid={hasError || undefined}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
