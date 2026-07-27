import { cn } from '@/lib/utils/cn';

export interface AlertProps {
  variant?: 'error' | 'success' | 'info';
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<NonNullable<AlertProps['variant']>, string> = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-green-200 bg-green-50 text-green-800',
  info: 'border-zinc-200 bg-zinc-50 text-zinc-800',
};

/** Accessible status message. Uses `role="alert"` so screen readers announce it as soon as it renders. */
export function Alert({ variant = 'info', children, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn('rounded-md border px-4 py-3 text-sm', VARIANT_STYLES[variant], className)}
    >
      {children}
    </div>
  );
}
