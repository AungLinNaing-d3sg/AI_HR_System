import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as timesheetsBackend from '@/lib/api/timesheetsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import type { TimesheetPeriodUnlockResponsePayload } from '@/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/timesheets/periods/:id/unlock
 *
 * Unlocks a previously locked timesheet period, allowing entries against it
 * again. `SystemAdmin`/`ProjectAdmin`-only, matching the rest of
 * `app/api/timesheets/periods/**`. The backend's `UnlockTimesheetPeriod`
 * returns `Data: null` on success, so this handler reports back the id/state
 * it just requested rather than anything read from the backend response.
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
      { message: 'Only a System Admin or Project Admin can unlock timesheet periods.' },
      { status: 403 }
    );
  }

  try {
    await timesheetsBackend.unlockTimesheetPeriod(id, accessToken);
    return NextResponse.json<TimesheetPeriodUnlockResponsePayload>({ id, isLocked: false }, { status: 200 });
  } catch (error) {
    logger.error('Unlock timesheet period failed', error);
    const details = getBackendErrorDetails(error, 'Could not unlock this timesheet period.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
