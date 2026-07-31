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
import { userRolesSummaryExportQuerySchema } from '@/lib/validators/report.validators';

/**
 * GET /api/reports/roles-summary/export?startDate=&endDate=&projectId=&format=
 *
 * Streams back the raw xlsx/csv file `ExportUserRolesSummary` returns - see
 * `app/api/reports/timesheet/export/route.ts` for the shared pattern this
 * mirrors, including the `ProjectAdmin` -> `ExportMyUserRolesSummary` /
 * `SystemAdmin` -> `ExportUserRolesSummary` routing.
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
  const parsed = userRolesSummaryExportQuerySchema.safeParse(
    pickSearchParams(searchParams, ['startDate', 'endDate', 'projectId', 'format'])
  );
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the report filters.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const file =
      role === 'ProjectAdmin'
        ? await reportsBackend.exportMyUserRolesSummary(parsed.data, accessToken)
        : await reportsBackend.exportUserRolesSummary(parsed.data, accessToken);

    return new NextResponse(file.data, {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="user-roles-summary.${parsed.data.format}"`,
      },
    });
  } catch (error) {
    logger.error('Export user roles summary failed', error);
    const details = getBackendFileErrorDetails(error, 'Could not export the user roles summary.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
