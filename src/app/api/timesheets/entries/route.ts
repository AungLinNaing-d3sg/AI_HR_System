import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as timesheetsBackend from '@/lib/api/timesheetsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapTimesheetEntry } from '@/lib/utils/mapTimesheet';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { createTimesheetEntrySchema } from '@/lib/validators/timesheet.validators';
import type { TimesheetEntryResponsePayload } from '@/types/api.types';

/**
 * POST /api/timesheets/entries
 *
 * Creates a single project/day timesheet entry from the weekly grid. Any
 * authenticated role may call this - see `app/api/timesheets/week/route.ts`
 * for why no extra role gate is applied. The backend derives the owning user
 * from the bearer token itself (`CreateTimesheetEntry`'s request body has no
 * `UserId` field - see docs/HR_System_BE.postman_collection.json), so a
 * caller can never create an entry "as" another user.
 */
export async function POST(request: Request): Promise<NextResponse> {
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

  const parsed = createTimesheetEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await timesheetsBackend.createTimesheetEntry(
      {
        ProjectId: parsed.data.projectId,
        TimesheetPeriodId: parsed.data.timesheetPeriodId,
        EntryDate: parsed.data.entryDate,
        Hours: parsed.data.hours,
        TaskDescription: parsed.data.taskDescription || null,
      },
      accessToken
    );

    return NextResponse.json<TimesheetEntryResponsePayload>({ entry: mapTimesheetEntry(dto) }, { status: 201 });
  } catch (error) {
    logger.error('Create timesheet entry failed', error);
    const details = getBackendErrorDetails(error, 'Could not save this timesheet entry.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
