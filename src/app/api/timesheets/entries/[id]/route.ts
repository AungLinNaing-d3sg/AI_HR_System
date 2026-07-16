import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as timesheetsBackend from '@/lib/api/timesheetsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapTimesheetEntry } from '@/lib/utils/mapTimesheet';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { updateTimesheetEntrySchema } from '@/lib/validators/timesheet.validators';
import type { TimesheetEntryResponsePayload } from '@/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/timesheets/entries/:id
 *
 * Updates the Hours/TaskDescription of an existing entry from the weekly
 * grid. The backend itself rejects edits to approved or period-locked
 * entries (see docs/HR_System_BE.postman_collection.json); this route
 * forwards that rejection rather than re-implementing the check.
 */
export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = updateTimesheetEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await timesheetsBackend.updateTimesheetEntry(
      id,
      { Hours: parsed.data.hours, TaskDescription: parsed.data.taskDescription || null },
      accessToken
    );

    return NextResponse.json<TimesheetEntryResponsePayload>({ entry: mapTimesheetEntry(dto) }, { status: 200 });
  } catch (error) {
    logger.error('Update timesheet entry failed', error);
    const details = getBackendErrorDetails(error, 'Could not update this timesheet entry.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
