import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as invoicesBackend from '@/lib/api/invoicesBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { INVOICE_LIST_PAGE_SIZE } from '@/lib/constants/invoice.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapGeneratedInvoice, mapInvoiceSummaryList } from '@/lib/utils/mapInvoice';
import { resolvePagination } from '@/lib/utils/pagination';
import { pickSearchParams } from '@/lib/utils/searchParams';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { generateInvoiceSchema, invoiceListQuerySchema } from '@/lib/validators/invoice.validators';
import type { GeneratedInvoiceResponsePayload, InvoiceListResponsePayload } from '@/types/api.types';

function unauthorized(): NextResponse {
  return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
}

function forbidden(action: string): NextResponse {
  return NextResponse.json({ message: `Only a System Admin or Project Admin can ${action}.` }, { status: 403 });
}

/**
 * Both handlers below restrict Invoices to `PROJECT_MANAGEMENT_ROLES`
 * (`SystemAdmin`/`ProjectAdmin`). Invoicing is client billing/financial data,
 * so - mirroring the Report domain's own documented choice (see
 * `app/api/reports/timesheet/route.ts`) - this app deliberately gates it
 * even though `/Invoice/*` is tagged only `[Auth]` (no role restriction) in
 * docs/HR_System_BE.postman_collection.json.
 */

/**
 * GET /api/invoices?projectId=&status=&pageNo=&pageSize=
 *
 * Lists invoices, backing the `/invoices` table's status-count chips (an
 * unfiltered, unpaginated call - see `INVOICE_LIST_PAGE_SIZE`) and its own
 * paginated, status-filtered row table (see `InvoicesTable`).
 *
 * A `ProjectAdmin` is routed to `Invoice/GetMyInvoices`
 * (`invoicesBackend.getMyInvoices`), which the backend automatically scopes
 * to that caller's own assigned projects; a `SystemAdmin` keeps using the
 * unscoped `Invoice/GetAllInvoices` (`invoicesBackend.getAllInvoices`) for
 * system-wide access. Both endpoints share the same request/response shape,
 * so the rest of this handler (validation, pagination, mapping) is identical
 * for either role - mirroring `app/api/reports/timesheet/route.ts`'s own
 * `get*`/`getMy*` role split.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) return unauthorized();

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) return forbidden('view invoices');

  const searchParams = new URL(request.url).searchParams;
  const parsed = invoiceListQuerySchema.safeParse(pickSearchParams(searchParams, ['projectId', 'status']));
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the invoice filters.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const { pageNo, pageSize } = resolvePagination(searchParams, { pageNo: 1, pageSize: INVOICE_LIST_PAGE_SIZE });

  try {
    const query = {
      projectId: parsed.data.projectId,
      status: parsed.data.status,
      page: pageNo,
      pageSize,
    };
    const dto =
      role === 'ProjectAdmin'
        ? await invoicesBackend.getMyInvoices(query, accessToken)
        : await invoicesBackend.getAllInvoices(query, accessToken);
    return NextResponse.json<InvoiceListResponsePayload>(
      {
        invoices: mapInvoiceSummaryList(dto.Items),
        totalCount: dto.TotalCount,
        pageNo: dto.Page,
        pageSize: dto.PageSize,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('List invoices failed', error);
    const details = getBackendErrorDetails(error, 'Could not load invoices.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * POST /api/invoices
 *
 * Generates a new Draft invoice from approved timesheet entries
 * (`Invoice/GenerateInvoice`), backing the `/invoices/generate` form.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) return unauthorized();

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) return forbidden('generate invoices');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = generateInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await invoicesBackend.generateInvoice(
      {
        ProjectId: parsed.data.projectId,
        BillingPeriodStart: parsed.data.billingPeriodStart,
        BillingPeriodEnd: parsed.data.billingPeriodEnd,
        CurrencyId: parsed.data.currencyId,
        ClientName: parsed.data.clientName,
        ClientEmail: parsed.data.clientEmail || null,
        IssuedDate: parsed.data.issuedDate,
        DueDate: parsed.data.dueDate,
        Notes: parsed.data.notes || null,
      },
      accessToken
    );

    return NextResponse.json<GeneratedInvoiceResponsePayload>(
      { invoice: mapGeneratedInvoice(dto) },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Generate invoice failed', error);
    const details = getBackendErrorDetails(error, 'Could not generate the invoice.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
