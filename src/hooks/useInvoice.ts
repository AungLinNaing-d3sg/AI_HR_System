'use client';

import { useQuery } from '@tanstack/react-query';
import * as invoicesApi from '@/lib/api/invoices.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Fetches a single invoice (with line items) by id. Query key: `['invoices', 'detail', id]`. */
export function useInvoice(id: string) {
  const query = useQuery({
    queryKey: ['invoices', 'detail', id],
    queryFn: () => invoicesApi.getInvoice(id),
    enabled: Boolean(id),
  });

  return {
    invoice: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load this invoice.') : null,
    refetch: query.refetch,
  };
}
