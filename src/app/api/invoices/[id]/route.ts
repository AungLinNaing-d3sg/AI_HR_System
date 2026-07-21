import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as invoicesBackend from '@/lib/api/invoicesBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapInvoiceDetail } from '@/lib/utils/mapInvoice';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { updateInvoiceSchema } from '@/lib/validators/invoice.validators';
import type { InvoiceResponsePayload, InvoiceUpdateResponsePayload } from '@/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function unauthorized(): NextResponse {
  return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
}

function forbidden(action: string): NextResponse {
  return NextResponse.json({ message: `Only a System Admin or Project Admin can ${action}.` }, { status: 403 });
}

/**
 * All three handlers below restrict Invoices to `PROJECT_MANAGEMENT_ROLES` -
 * see `app/api/invoices/route.ts` for the rationale.
 */

/**
 * GET /api/invoices/:id
 *
 * Fetches full invoice detail (including line items) by GUID, backing the
 * `/invoices/[id]` view (`docs/HR_System_FE_wireframe.pdf`).
 */
export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) return unauthorized();

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) return forbidden('view invoices');

  try {
    const dto = await invoicesBackend.getInvoiceById(id, accessToken);
    return NextResponse.json<InvoiceResponsePayload>({ invoice: mapInvoiceDetail(dto) }, { status: 200 });
  } catch (error) {
    logger.error('Get invoice failed', error);
    const details = getBackendErrorDetails(error, 'Could not load the invoice.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * PUT /api/invoices/:id
 *
 * Updates editable fields on a Draft invoice (`Invoice/UpdateInvoice`); the
 * backend itself enforces the Draft-only restriction (see
 * `getBackendErrorDetails`, which forwards that rejection's message
 * unchanged). Backs the `/invoices/[id]` edit form.
 */
export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) return unauthorized();

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) return forbidden('edit invoices');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = updateInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await invoicesBackend.updateInvoice(
      id,
      {
        CurrencyId: parsed.data.currencyId,
        ClientName: parsed.data.clientName,
        ClientEmail: parsed.data.clientEmail || null,
        IssuedDate: parsed.data.issuedDate,
        DueDate: parsed.data.dueDate,
        Notes: parsed.data.notes || null,
      },
      accessToken
    );

    return NextResponse.json<InvoiceUpdateResponsePayload>(
      {
        invoice: {
          id: dto.Id,
          invoiceNumber: dto.InvoiceNumber,
          clientName: dto.ClientName,
          clientEmail: dto.ClientEmail,
          issuedDate: dto.IssuedDate,
          dueDate: dto.DueDate,
          notes: dto.Notes,
          status: dto.Status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Update invoice failed', error);
    const details = getBackendErrorDetails(error, 'Could not update the invoice.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * DELETE /api/invoices/:id
 *
 * Soft-deletes a Draft invoice (`Invoice/DeleteInvoice`); the backend
 * enforces the Draft-only restriction.
 */
export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) return unauthorized();

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) return forbidden('delete invoices');

  try {
    await invoicesBackend.deleteInvoice(id, accessToken);
    return NextResponse.json({ success: true, message: 'Invoice deleted successfully.' }, { status: 200 });
  } catch (error) {
    logger.error('Delete invoice failed', error);
    const details = getBackendErrorDetails(error, 'Could not delete the invoice.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
