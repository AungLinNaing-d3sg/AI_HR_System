import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-24 w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm',
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
Textarea.displayName = 'Textarea';
