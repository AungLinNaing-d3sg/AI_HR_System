import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ReportCardProps {
  href: string;
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  description: string;
  tags: readonly string[];
}

/**
 * A single clickable report card on the `/reports` hub
 * (`docs/HR_System_FE_wireframe.pdf`): icon, title, description, a row of
 * data-point tag chips, and a "View Report ->" link. The whole card is one
 * focusable/clickable `Link` (not a nested interactive element inside a
 * card), so it is reachable and activatable with a single Tab stop + Enter,
 * per standard link semantics.
 */
export function ReportCard({ href, icon: Icon, iconClassName, title, description, tags }: ReportCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-lg border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900"
    >
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-md', iconClassName)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-sm font-semibold text-zinc-900">{title}</h2>
      <p className="mt-1 flex-1 text-sm text-zinc-500">{description}</p>
      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={`${title} data points`}>
        {tags.map((tag) => (
          <li key={tag} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
            {tag}
          </li>
        ))}
      </ul>
      <span className="mt-4 text-sm font-medium text-brand group-hover:underline">View Report &rarr;</span>
    </Link>
  );
}
