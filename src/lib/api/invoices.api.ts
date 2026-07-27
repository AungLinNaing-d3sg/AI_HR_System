import { axiosInstance } from '@/lib/api/axios';
import type {
  GeneratedInvoiceResponsePayload,
  InvoiceListResponsePayload,
  InvoiceResponsePayload,
  InvoiceStatusResponsePayload,
  InvoiceUpdateResponsePayload,
} from '@/types/api.types';
import type { GeneratedInvoice, InvoiceDetail, InvoiceStatus, InvoiceSummary } from '@/types/domain.types';
import type { GenerateInvoiceFormValues, UpdateInvoiceFormValues } from '@/lib/validators/invoice.validators';

/**
 * Client-side Invoice domain module. Hooks (`useInvoices`, `useInvoice`,
 * `useGenerateInvoice`, `useUpdateInvoice`, `useSendInvoice`,
 * `useMarkInvoicePaid`, `useVoidInvoice`, `useCancelInvoice`,
 * `useDeleteInvoice`, `useDownloadInvoicePdf`) call these functions instead
 * of touching Axios directly; every call here is same-origin, against this
 * app's own `/api/invoices/*` Route Handlers.
 */

export interface InvoiceListFilters {
  projectId?: string;
  status?: InvoiceStatus;
  pageNo?: number;
  pageSize?: number;
}

export interface InvoiceListResult {
  invoices: InvoiceSummary[];
  totalCount: number;
}

export async function getInvoices(filters: InvoiceListFilters = {}): Promise<InvoiceListResult> {
  const { data } = await axiosInstance.get<InvoiceListResponsePayload>('/invoices', { params: filters });
  return { invoices: data.invoices, totalCount: data.totalCount };
}

export async function getInvoice(id: string): Promise<InvoiceDetail> {
  const { data } = await axiosInstance.get<InvoiceResponsePayload>(`/invoices/${id}`);
  return data.invoice;
}

export async function generateInvoice(values: GenerateInvoiceFormValues): Promise<GeneratedInvoice> {
  const { data } = await axiosInstance.post<GeneratedInvoiceResponsePayload>('/invoices', values);
  return data.invoice;
}

export async function updateInvoice(
  id: string,
  values: UpdateInvoiceFormValues
): Promise<InvoiceUpdateResponsePayload['invoice']> {
  const { data } = await axiosInstance.put<InvoiceUpdateResponsePayload>(`/invoices/${id}`, values);
  return data.invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  await axiosInstance.delete(`/invoices/${id}`);
}

export async function sendInvoice(id: string): Promise<InvoiceStatusResponsePayload> {
  const { data } = await axiosInstance.put<InvoiceStatusResponsePayload>(`/invoices/${id}/send`);
  return data;
}

export async function markInvoicePaid(id: string): Promise<InvoiceStatusResponsePayload> {
  const { data } = await axiosInstance.put<InvoiceStatusResponsePayload>(`/invoices/${id}/mark-paid`);
  return data;
}

export async function voidInvoice(id: string): Promise<InvoiceStatusResponsePayload> {
  const { data } = await axiosInstance.put<InvoiceStatusResponsePayload>(`/invoices/${id}/void`);
  return data;
}

export async function cancelInvoice(id: string): Promise<InvoiceStatusResponsePayload> {
  const { data } = await axiosInstance.put<InvoiceStatusResponsePayload>(`/invoices/${id}/cancel`);
  return data;
}

/**
 * Triggers a browser file download for an already-fetched PDF `Blob`.
 * Mirrors `reports.api.ts`'s own (non-exported) `triggerDownload` helper -
 * see that file for why a throwaway anchor element is used.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadInvoicePdf(id: string, invoiceNumber: string): Promise<void> {
  const { data } = await axiosInstance.get<Blob>(`/invoices/${id}/pdf`, { responseType: 'blob' });
  triggerDownload(data, `${invoiceNumber}.pdf`);
}
