import { forwardRef } from 'react';
import type { LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn('mb-1.5 block text-sm font-medium text-zinc-900', className)}
        {...props}
      />
    );
  }
);
Label.displayName = 'Label';
