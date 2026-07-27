import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as invoicesBackend from '@/lib/api/invoicesBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { getBackendFileErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/invoices/:id/pdf
 *
 * Streams back the invoice PDF (`Invoice/GetInvoicePdf`) - mirrors the
 * Report domain's export Route Handlers (see
 * `app/api/reports/timesheet/export/route.ts`) for the arraybuffer
 * streaming + `getBackendFileErrorDetails` pattern, since this is likewise a
 * binary (`application/pdf`) response rather than the usual JSON envelope.
 * Backs the "Download PDF" action on `/invoices/[id]`.
 */
export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
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
      { message: 'Only a System Admin or Project Admin can download invoices.' },
      { status: 403 }
    );
  }

  try {
    const file = await invoicesBackend.getInvoicePdf(id, accessToken);
    return new NextResponse(file.data, {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
      },
    });
  } catch (error) {
    logger.error('Download invoice PDF failed', error);
    const details = getBackendFileErrorDetails(error, 'Could not download the invoice PDF.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
