'use client';

import { useQuery } from '@tanstack/react-query';
import * as invoicesApi from '@/lib/api/invoices.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { InvoiceListFilters } from '@/lib/api/invoices.api';

/**
 * Lists invoices. `filters` may include `pageNo`/`pageSize` to drive the
 * `/invoices` table's own server-side pagination (see `InvoicesTable`), in
 * addition to the existing `projectId`/`status` filters. Query key:
 * `['invoices', 'list', filters]` (per the hierarchical tuple convention).
 */
export function useInvoices(filters: InvoiceListFilters = {}) {
  const query = useQuery({
    queryKey: ['invoices', 'list', filters],
    queryFn: () => invoicesApi.getInvoices(filters),
  });

  return {
    invoices: query.data?.invoices ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load invoices.') : null,
    refetch: query.refetch,
  };
}
