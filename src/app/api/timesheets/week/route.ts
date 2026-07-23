import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as projectsBackend from '@/lib/api/projectsBackend.api';
import * as timesheetsBackend from '@/lib/api/timesheetsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractUserId, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapProjectList } from '@/lib/utils/mapProject';
import { mapTimesheetEntryList, mapTimesheetPeriodList } from '@/lib/utils/mapTimesheet';
import { filterProjectsAssignedToUser } from '@/lib/utils/timesheetAccess';
import { addDays, getMondayOfWeek, isValidDateString } from '@/lib/utils/week';
import type { TimesheetWeekResponsePayload } from '@/types/api.types';

/**
 * GET /api/timesheets/week?weekStart=YYYY-MM-DD
 *
 * Combined read model for the `/timesheets` weekly grid: joins the active
 * Project list - narrowed down to only the projects the caller is
 * themselves actively assigned to (`filterProjectsAssignedToUser`), so the
 * grid's rows and default total hours reflect the caller's own assignments
 * rather than every active project system-wide - with whichever Timesheet
 * Period covers the requested week and that period's entries for the
 * current user, so the client only needs one request per week viewed
 * instead of orchestrating three. No extra RBAC gate beyond "authenticated"
 * is applied here (unlike `/api/projects`) - the underlying
 * `/TimesheetEntry/*` and `/TimesheetPeriod/*` endpoints are tagged only
 * `[Auth]` in docs/HR_System_BE.postman_collection.json, and every role
 * (including a plain `User`) needs to be able to log their own hours
 * against their own assigned projects.
 */
export async function GET(request: Request): Promise<NextResponse> {
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

  const requestedWeekStart = new URL(request.url).searchParams.get('weekStart');
  const weekStart =
    requestedWeekStart && isValidDateString(requestedWeekStart)
      ? getMondayOfWeek(new Date(`${requestedWeekStart}T00:00:00.000Z`))
      : getMondayOfWeek();
  const weekEnd = addDays(weekStart, 6);

  try {
    const [allProjectDtos, periodDtos, entryDtos] = await Promise.all([
      projectsBackend.getProjectList(accessToken),
      timesheetsBackend.getTimesheetPeriods(accessToken),
      timesheetsBackend.getTimesheetEntries(accessToken, { userId }),
    ]);

    const activeProjectDtos = allProjectDtos.filter((project) => project.IsActive);
    const projectDtos = await filterProjectsAssignedToUser(activeProjectDtos, userId, accessToken);

    const periods = mapTimesheetPeriodList(periodDtos);
    // Timesheet Periods are typically monthly and a displayed week can span
    // two of them (e.g. the last week of January bleeding into February), so
    // a period only needs to *overlap* the displayed week, not fully contain
    // it, to be considered "the" period for this view. Entries are still
    // date-filtered below regardless of the chosen period's own boundaries.
    const period =
      periods.find((candidate) => candidate.periodStart <= weekEnd && candidate.periodEnd >= weekStart) ?? null;

    const entries = mapTimesheetEntryList(entryDtos).filter(
      (entry) => entry.entryDate >= weekStart && entry.entryDate <= weekEnd
    );

    const payload: TimesheetWeekResponsePayload = {
      weekStart,
      weekEnd,
      period,
      projects: mapProjectList(projectDtos),
      entries,
    };

    return NextResponse.json<TimesheetWeekResponsePayload>(payload, { status: 200 });
  } catch (error) {
    logger.error('Load timesheet week failed', error);
    const details = getBackendErrorDetails(error, 'Could not load the timesheet for this week.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
