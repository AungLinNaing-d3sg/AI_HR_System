import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as reportsBackend from '@/lib/api/reportsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapMonthlyCostRevenue } from '@/lib/utils/mapReport';
import { pickSearchParams } from '@/lib/utils/searchParams';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { monthlyCostRevenueQuerySchema } from '@/lib/validators/report.validators';
import type { MonthlyCostRevenueResponsePayload } from '@/types/api.types';

/**
 * GET /api/reports/cost-revenue?year=&month=&projectId=&currencyId=
 *
 * Backs the `/reports/cost-revenue` KPI cards + cost/revenue table + chart
 * placeholder (`docs/HR_System_FE_wireframe.pdf`). Same
 * `PROJECT_MANAGEMENT_ROLES` gate as the other Report routes - project
 * cost/revenue is financial data, not something a plain `User` needs to see.
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
  const parsed = monthlyCostRevenueQuerySchema.safeParse(
    pickSearchParams(searchParams, ['year', 'month', 'projectId', 'currencyId'])
  );
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the report filters.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await reportsBackend.getMonthlyCostRevenue(parsed.data, accessToken);
    return NextResponse.json<MonthlyCostRevenueResponsePayload>(
      { report: mapMonthlyCostRevenue(dto) },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Generate monthly cost/revenue report failed', error);
    const details = getBackendErrorDetails(error, 'Could not generate the cost & revenue report.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
