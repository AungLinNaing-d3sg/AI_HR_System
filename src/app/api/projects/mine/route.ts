import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as projectsBackend from '@/lib/api/projectsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapProjectList } from '@/lib/utils/mapProject';
import type { ProjectListResponsePayload } from '@/types/api.types';

/**
 * GET /api/projects/mine
 *
 * Backs the `/projects` management table (see `useProjectList`) and the
 * Project filter/select on `/reports/timesheet`, `/reports/cost-revenue`,
 * and `/invoices/generate` (see `useMyProjects`/`useProjectFilterOptions`)
 * for a `ProjectAdmin` caller, scoped to that caller's own assigned projects
 * via `Project/GetMyProjectList` (`projectsBackend.getMyProjectList`) - a
 * separate endpoint from the unscoped `GET /api/projects` (`GetProjectList`),
 * which keeps listing every project, unchanged, for a `SystemAdmin` (or any
 * other role) via `useProjects`. A `SystemAdmin` never calls this endpoint
 * (their table/filters keep using `useProjects`/`GetProjectList`, per the
 * feature spec); it's restricted to `PROJECT_MANAGEMENT_ROLES` purely as a
 * safety net, mirroring the same gate already applied to the Report/Invoice
 * domains (see `app/api/reports/timesheet/route.ts`,
 * `app/api/invoices/route.ts`).
 */
export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) {
    return NextResponse.json(
      { message: 'Only a System Admin or Project Admin can view this project list.' },
      { status: 403 }
    );
  }

  try {
    const dtos = await projectsBackend.getMyProjectList(accessToken);
    return NextResponse.json<ProjectListResponsePayload>({ projects: mapProjectList(dtos) }, { status: 200 });
  } catch (error) {
    logger.error('List my projects failed', error);
    const details = getBackendErrorDetails(error, 'Could not load projects.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
