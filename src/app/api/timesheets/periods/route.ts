import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as timesheetsBackend from '@/lib/api/timesheetsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapTimesheetPeriod, mapTimesheetPeriodList } from '@/lib/utils/mapTimesheet';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { createTimesheetPeriodSchema } from '@/lib/validators/timesheet.validators';
import type { TimesheetPeriodListResponsePayload, TimesheetPeriodResponsePayload } from '@/types/api.types';

/**
 * `POST` (create) requires `SystemAdmin`/`ProjectAdmin` - creating and
 * locking the *periods* themselves is a payroll/admin operation. `GET`
 * (list), however, is open to any authenticated role: the `/timesheets`
 * "My Timesheets" page's Timesheet Period dropdown (every role logs their
 * own hours, see `app/api/timesheets/week/route.ts`) needs to read the full
 * period list to let a user pick which period to log time against, the same
 * "no extra RBAC gate beyond authenticated" reasoning that route already
 * documents. The backend's `/TimesheetPeriod/*` endpoints carry no distinct
 * role tag in docs/HR_System_BE.postman_collection.json (same as
 * `/Project/*` before it), so both the restriction on `POST` and its absence
 * on `GET` are this app's own choice, not something the backend enforces.
 */

/**
 * GET /api/timesheets/periods
 *
 * Lists every timesheet period, newest first.
 */
export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  try {
    const dtos = await timesheetsBackend.getTimesheetPeriods(accessToken);
    const periods = mapTimesheetPeriodList(dtos).sort((a, b) => b.periodStart.localeCompare(a.periodStart));
    return NextResponse.json<TimesheetPeriodListResponsePayload>({ periods }, { status: 200 });
  } catch (error) {
    logger.error('List timesheet periods failed', error);
    const details = getBackendErrorDetails(error, 'Could not load timesheet periods.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * POST /api/timesheets/periods
 *
 * Creates a new timesheet period. The backend itself is the authority on
 * whether a period's dates overlap an existing one - this is forwarded
 * rather than re-implemented (same pattern as the locked/approved-entry
 * rejections in `app/api/timesheets/entries/*`).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) {
    return NextResponse.json(
      { message: 'Only a System Admin or Project Admin can create timesheet periods.' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = createTimesheetPeriodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await timesheetsBackend.createTimesheetPeriod(
      { PeriodStart: parsed.data.periodStart, PeriodEnd: parsed.data.periodEnd },
      accessToken
    );

    return NextResponse.json<TimesheetPeriodResponsePayload>(
      { period: mapTimesheetPeriod(dto) },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Create timesheet period failed', error);
    const details = getBackendErrorDetails(error, 'Could not create the timesheet period.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
