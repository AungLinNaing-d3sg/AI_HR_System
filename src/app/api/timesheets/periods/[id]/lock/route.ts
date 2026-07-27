import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as timesheetsBackend from '@/lib/api/timesheetsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import type { TimesheetPeriodLockResponsePayload } from '@/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/timesheets/periods/:id/lock
 *
 * Locks a timesheet period, preventing further entries against it.
 * `SystemAdmin`/`ProjectAdmin`-only, matching the rest of
 * `app/api/timesheets/periods/**`. The backend's `LockTimesheetPeriod`
 * response is a partial confirmation only (`LockedAt`) - see
 * `TimesheetPeriodLockResponsePayload` - callers refetch the periods list to
 * see the updated row.
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
      { message: 'Only a System Admin or Project Admin can lock timesheet periods.' },
      { status: 403 }
    );
  }

  try {
    const dto = await timesheetsBackend.lockTimesheetPeriod(id, accessToken);
    return NextResponse.json<TimesheetPeriodLockResponsePayload>(
      { id, isLocked: true, lockedAt: dto.LockedAt },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Lock timesheet period failed', error);
    const details = getBackendErrorDetails(error, 'Could not lock this timesheet period.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
