import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface BackLinkProps {
  href: string;
  label: string;
}

/** Bordered square icon button that links back to a parent page, matching the wireframe's form-header back arrow. */
export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-zinc-900"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
