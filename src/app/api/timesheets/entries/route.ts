import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as timesheetsBackend from '@/lib/api/timesheetsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { MAX_PAGE_SIZE } from '@/lib/constants/pagination.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractUserId, isTokenExpired } from '@/lib/utils/jwt';
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
 *
 * "Allow one submission per user's local calendar day": `CreateTimesheetEntry`
 * has no documented uniqueness constraint of its own, so this route enforces
 * it here - a user may only have one entry per project per calendar day (the
 * grid already reads/writes one entry per project/day cell; this guards
 * against a stale cell falling back to `create` instead of `update`, e.g.
 * from two open tabs, and creating a duplicate). `entryDate` itself is
 * whatever calendar day the client resolved as "today" using its own local
 * timezone (see `lib/utils/week.ts`'s `getLocalDateString`), not the
 * server's.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  const userId = extractUserId(claims);
  if (!userId) {
    return NextResponse.json({ message: 'Could not identify the current user.' }, { status: 401 });
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
    // `GetAllTimesheetEntries` now returns the standard paginated envelope
    // (see `TimesheetEntryListResponse` in types/api.types.ts) rather than a
    // bare array - this check needs every entry the caller already has for
    // this project (to catch a same-day duplicate anywhere in that set), not
    // just one page of it, so it explicitly requests the maximum page size
    // instead of leaving it to default to the standard list-page size.
    const sameDayEntries = await timesheetsBackend.getTimesheetEntries(accessToken, {
      userId,
      projectId: parsed.data.projectId,
      pageSize: MAX_PAGE_SIZE,
    });
    const alreadySubmitted = sameDayEntries.Items.some((entry) => entry.EntryDate === parsed.data.entryDate);
    if (alreadySubmitted) {
      return NextResponse.json(
        {
          message:
            'You already have a timesheet entry for this project on this day. Edit the existing entry instead of creating a new one.',
        },
        { status: 409 }
      );
    }

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
