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
 * GET /api/timesheets/week?weekStart=YYYY-MM-DD&periodId=<id>
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
 *
 * The optional `periodId` lets the "Timesheet Period" dropdown
 * (`TimesheetGrid`'s `goToPeriod`) pin the *specific* period the caller
 * picked, instead of only ever re-deriving "the" period from the resolved
 * week's date range: two Timesheet Periods can both overlap the same
 * calendar week (e.g. a period ending mid-week and the very next one
 * starting right after), and without `periodId` the plain overlap lookup
 * below always resolves to whichever of those candidates happens to come
 * first in `periods`, regardless of which one the dropdown's option was
 * actually for - making that later-starting option look unselectable (the
 * grid would keep snapping back to the earlier period). When `periodId` is
 * given but doesn't match any known period (stale/removed), this falls back
 * to the same overlap lookup used when `periodId` is absent entirely (plain
 * week navigation via Previous/Next/This week).
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

  const requestSearchParams = new URL(request.url).searchParams;
  const requestedWeekStart = requestSearchParams.get('weekStart');
  const requestedPeriodId = requestSearchParams.get('periodId');
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
    const overlappingPeriod =
      periods.find((candidate) => candidate.periodStart <= weekEnd && candidate.periodEnd >= weekStart) ?? null;
    // Prefer the explicitly requested period (see the doc comment above for
    // why the plain overlap lookup alone isn't enough) whenever it still
    // exists; otherwise fall back to the overlap lookup exactly as before.
    const period = requestedPeriodId
      ? (periods.find((candidate) => candidate.id === requestedPeriodId) ?? overlappingPeriod)
      : overlappingPeriod;

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
