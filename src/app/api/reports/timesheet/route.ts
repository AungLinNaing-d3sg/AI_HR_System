import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as reportsBackend from '@/lib/api/reportsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { REPORT_PAGE_SIZE } from '@/lib/constants/report.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapTimesheetReport } from '@/lib/utils/mapReport';
import { resolvePagination } from '@/lib/utils/pagination';
import { pickSearchParams } from '@/lib/utils/searchParams';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { timesheetReportQuerySchema } from '@/lib/validators/report.validators';
import type { TimesheetReportResponsePayload } from '@/types/api.types';

/**
 * GET /api/reports/timesheet?startDate=&endDate=&projectId=&userId=&isApproved=&pageNo=&pageSize=
 *
 * Backs the `/reports/timesheet` filter bar + data table
 * (`docs/HR_System_FE_wireframe.pdf`). `Report/*` endpoints are tagged only
 * `[Auth]` in docs/HR_System_BE.postman_collection.json (no role
 * restriction there), but reviewing every user's/project's timesheet data is
 * a management operation, not something a plain `User` needs - this app's
 * own choice, matching the `PROJECT_MANAGEMENT_ROLES` gate already applied
 * to `/timesheets/periods` and the Approve action on `/timesheets/history`.
 * `pageNo`/`pageSize` are optional, falling back to one large page
 * (`REPORT_PAGE_SIZE`) if omitted.
 *
 * A `ProjectAdmin` is routed to `GenerateMyTimesheetReport`
 * (`reportsBackend.getMyTimesheetReport`), which the backend automatically
 * scopes to that caller's own assigned projects; a `SystemAdmin` keeps using
 * the unscoped `GenerateTimesheetReport` (`reportsBackend.getTimesheetReport`)
 * for system-wide oversight. Both endpoints share the same request/response
 * shape, so the rest of this handler (validation, pagination, mapping) is
 * identical for either role.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) {
    return NextResponse.json(
      { message: 'Only a System Admin or Project Admin can view reports.' },
      { status: 403 }
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const parsed = timesheetReportQuerySchema.safeParse(
    pickSearchParams(searchParams, ['startDate', 'endDate', 'projectId', 'userId', 'isApproved'])
  );
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the report filters.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const { pageNo, pageSize } = resolvePagination(searchParams, { pageNo: 1, pageSize: REPORT_PAGE_SIZE });

  try {
    const query = {
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      projectId: parsed.data.projectId,
      userId: parsed.data.userId,
      isApproved: parsed.data.isApproved === undefined ? undefined : parsed.data.isApproved === 'true',
      page: pageNo,
      pageSize,
    };
    const dto =
      role === 'ProjectAdmin'
        ? await reportsBackend.getMyTimesheetReport(query, accessToken)
        : await reportsBackend.getTimesheetReport(query, accessToken);

    return NextResponse.json<TimesheetReportResponsePayload>(
      { report: mapTimesheetReport(dto) },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Generate timesheet report failed', error);
    const details = getBackendErrorDetails(error, 'Could not generate the timesheet report.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
