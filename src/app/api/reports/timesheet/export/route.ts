import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as reportsBackend from '@/lib/api/reportsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { getBackendFileErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { pickSearchParams } from '@/lib/utils/searchParams';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { timesheetReportExportQuerySchema } from '@/lib/validators/report.validators';

/**
 * GET /api/reports/timesheet/export?startDate=&endDate=&projectId=&userId=&isApproved=&format=
 *
 * Streams back the raw xlsx/csv file `ExportTimesheetReport` returns - see
 * `app/api/reports/timesheet/route.ts` for the shared auth/role gate this
 * mirrors, and `getBackendFileErrorDetails` for why export errors need
 * different decoding than the JSON `Generate*` routes.
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
      { message: 'Only a System Admin or Project Admin can export reports.' },
      { status: 403 }
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const parsed = timesheetReportExportQuerySchema.safeParse(
    pickSearchParams(searchParams, ['startDate', 'endDate', 'projectId', 'userId', 'isApproved', 'format'])
  );
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the report filters.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const file = await reportsBackend.exportTimesheetReport(
      {
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        projectId: parsed.data.projectId,
        userId: parsed.data.userId,
        isApproved: parsed.data.isApproved === undefined ? undefined : parsed.data.isApproved === 'true',
        format: parsed.data.format,
      },
      accessToken
    );

    return new NextResponse(file.data, {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="timesheet-report.${parsed.data.format}"`,
      },
    });
  } catch (error) {
    logger.error('Export timesheet report failed', error);
    const details = getBackendFileErrorDetails(error, 'Could not export the timesheet report.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
