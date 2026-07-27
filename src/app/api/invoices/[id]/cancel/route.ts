import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as invoicesBackend from '@/lib/api/invoicesBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import type { InvoiceStatusResponsePayload } from '@/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/invoices/:id/cancel
 *
 * Cancels an invoice "regardless of current status" (`Invoice/CancelInvoice`,
 * no request body, per its documented description) - backs the "Cancel"
 * action on `/invoices/[id]`. Restricted to `PROJECT_MANAGEMENT_ROLES` - see
 * `app/api/invoices/route.ts` for the rationale.
 */
export async function PUT(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) {
    return NextResponse.json(
      { message: 'Only a System Admin or Project Admin can cancel invoices.' },
      { status: 403 }
    );
  }

  try {
    const dto = await invoicesBackend.cancelInvoice(id, accessToken);
    return NextResponse.json<InvoiceStatusResponsePayload>({ id: dto.Id, status: dto.Status }, { status: 200 });
  } catch (error) {
    logger.error('Cancel invoice failed', error);
    const details = getBackendErrorDetails(error, 'Could not cancel the invoice.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
