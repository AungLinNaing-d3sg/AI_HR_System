import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as timesheetsBackend from '@/lib/api/timesheetsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/timesheets/periods/:id
 *
 * Deletes a timesheet period. `SystemAdmin`/`ProjectAdmin`-only, matching
 * the `GET`/`POST` handlers in `app/api/timesheets/periods/route.ts` (see
 * that file's header comment for why this app restricts an endpoint the
 * backend itself tags only `[Auth]`). The backend is the authority on
 * whether a period with existing entries can be deleted - that rejection is
 * forwarded rather than re-implemented here.
 */
export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
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
      { message: 'Only a System Admin or Project Admin can delete timesheet periods.' },
      { status: 403 }
    );
  }

  try {
    await timesheetsBackend.deleteTimesheetPeriod(id, accessToken);
    return NextResponse.json({ success: true, message: 'Timesheet period deleted successfully.' }, { status: 200 });
  } catch (error) {
    logger.error('Delete timesheet period failed', error);
    const details = getBackendErrorDetails(error, 'Could not delete this timesheet period.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
