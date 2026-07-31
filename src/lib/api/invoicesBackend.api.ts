import 'server-only';

import { backendClient } from '@/lib/api/backendClient';
import type {
  GenerateInvoiceRequest,
  GenerateInvoiceResponseDto,
  InvoiceDetailDto,
  InvoiceListResponseDto,
  InvoiceStatusChangeResponseDto,
  UpdateInvoiceRequest,
  UpdateInvoiceResponseDto,
} from '@/types/api.types';
import type { InvoiceStatus } from '@/types/domain.types';

/**
 * Server-only Invoice domain module. Every function here calls the real
 * .NET `/api/v1/Invoice/*` endpoints (see
 * docs/HR_System_BE.postman_collection.json) through `backendClient`. Only
 * Route Handlers under `app/api/invoices/**` may import this file - it is
 * never bundled for the browser.
 *
 * `getAllInvoices` (`/Invoice/GetAllInvoices`) has a `ProjectAdmin`-scoped
 * counterpart, `getMyInvoices` (`/Invoice/GetMyInvoices`) - mirroring the
 * Report domain's own `get*`/`getMy*` pair (see `reportsBackend.api.ts`).
 * Both share the same query params and response shape; the backend
 * automatically scopes `GetMyInvoices` to the projects the calling
 * `ProjectAdmin` is assigned to. `app/api/invoices/route.ts` picks which one
 * to call based on the caller's role.
 */

function authHeader(accessToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${accessToken}` };
}

export interface InvoiceListQuery {
  projectId?: string;
  status?: InvoiceStatus;
  page?: number;
  pageSize?: number;
}

export async function getAllInvoices(query: InvoiceListQuery, accessToken: string): Promise<InvoiceListResponseDto> {
  const response = await backendClient.get<InvoiceListResponseDto>('/Invoice/GetAllInvoices', {
    headers: authHeader(accessToken),
    params: query,
  });
  return response.data;
}

/** `ProjectAdmin`-scoped counterpart of {@link getAllInvoices} - see the module doc comment above. */
export async function getMyInvoices(query: InvoiceListQuery, accessToken: string): Promise<InvoiceListResponseDto> {
  const response = await backendClient.get<InvoiceListResponseDto>('/Invoice/GetMyInvoices', {
    headers: authHeader(accessToken),
    params: query,
  });
  return response.data;
}

export async function getInvoiceById(id: string, accessToken: string): Promise<InvoiceDetailDto> {
  const response = await backendClient.get<InvoiceDetailDto>(`/Invoice/GetInvoiceById/${id}`, {
    headers: authHeader(accessToken),
  });
  return response.data;
}

export async function generateInvoice(
  payload: GenerateInvoiceRequest,
  accessToken: string
): Promise<GenerateInvoiceResponseDto> {
  const response = await backendClient.post<GenerateInvoiceResponseDto>('/Invoice/GenerateInvoice', payload, {
    headers: authHeader(accessToken),
  });
  return response.data;
}

export async function updateInvoice(
  id: string,
  payload: UpdateInvoiceRequest,
  accessToken: string
): Promise<UpdateInvoiceResponseDto> {
  const response = await backendClient.put<UpdateInvoiceResponseDto>(`/Invoice/UpdateInvoice/${id}`, payload, {
    headers: authHeader(accessToken),
  });
  return response.data;
}

export async function sendInvoice(id: string, accessToken: string): Promise<InvoiceStatusChangeResponseDto> {
  const response = await backendClient.put<InvoiceStatusChangeResponseDto>(
    `/Invoice/SendInvoice/${id}`,
    null,
    { headers: authHeader(accessToken) }
  );
  return response.data;
}

export async function markInvoicePaid(id: string, accessToken: string): Promise<InvoiceStatusChangeResponseDto> {
  const response = await backendClient.put<InvoiceStatusChangeResponseDto>(
    `/Invoice/MarkInvoicePaid/${id}`,
    null,
    { headers: authHeader(accessToken) }
  );
  return response.data;
}

export async function voidInvoice(id: string, accessToken: string): Promise<InvoiceStatusChangeResponseDto> {
  const response = await backendClient.put<InvoiceStatusChangeResponseDto>(
    `/Invoice/VoidInvoice/${id}`,
    null,
    { headers: authHeader(accessToken) }
  );
  return response.data;
}

export async function cancelInvoice(id: string, accessToken: string): Promise<InvoiceStatusChangeResponseDto> {
  const response = await backendClient.put<InvoiceStatusChangeResponseDto>(
    `/Invoice/CancelInvoice/${id}`,
    null,
    { headers: authHeader(accessToken) }
  );
  return response.data;
}

/** `DeleteInvoice` returns `Data: null` on success - see `DeleteInvoiceResponse` in api.types.ts. */
export async function deleteInvoice(id: string, accessToken: string): Promise<void> {
  await backendClient.delete(`/Invoice/DeleteInvoice/${id}`, { headers: authHeader(accessToken) });
}

/** A raw invoice PDF file, streamed back to the browser as-is by `app/api/invoices/[id]/pdf/route.ts`. */
export interface InvoicePdfFile {
  data: ArrayBuffer;
  contentType: string;
}

export async function getInvoicePdf(id: string, accessToken: string): Promise<InvoicePdfFile> {
  const response = await backendClient.get<ArrayBuffer>(`/Invoice/GetInvoicePdf/${id}`, {
    headers: authHeader(accessToken),
    responseType: 'arraybuffer',
  });
  const contentType =
    (response.headers as Record<string, string> | undefined)?.['content-type'] ?? 'application/pdf';
  return { data: response.data, contentType };
}
