import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getBreadcrumbs } from '@/lib/constants/breadcrumbs.constants';

interface BreadcrumbsProps {
  pathname: string;
}

export function Breadcrumbs({ pathname }: BreadcrumbsProps) {
  const crumbs = getBreadcrumbs(pathname);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />}
            {crumb.href && !isLast ? (
              <Link href={crumb.href} className="text-zinc-500 hover:text-zinc-900">
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium text-zinc-900' : 'text-zinc-500'}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
