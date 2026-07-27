import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as projectsBackend from '@/lib/api/projectsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapProjectList, mapProject } from '@/lib/utils/mapProject';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { createProjectSchema } from '@/lib/validators/project.validators';
import type { ProjectListResponsePayload, ProjectResponsePayload } from '@/types/api.types';

/**
 * Both handlers below only check for a valid session - Projects is open to
 * every authenticated role (see `lib/constants/project.constants.ts`), and
 * the backend's `/Project/*` endpoints are tagged only `[Auth]` anyway (no
 * role restriction there either).
 */

/**
 * GET /api/projects
 *
 * Lists all projects, visible to any authenticated user.
 */
export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  try {
    const dtos = await projectsBackend.getProjectList(accessToken);
    return NextResponse.json<ProjectListResponsePayload>({ projects: mapProjectList(dtos) }, { status: 200 });
  } catch (error) {
    logger.error('List projects failed', error);
    const details = getBackendErrorDetails(error, 'Could not load projects.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * POST /api/projects
 *
 * Creates a new project. Open to any authenticated user.
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

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await projectsBackend.createProject(
      {
        // `code` is already normalized to uppercase by `createProjectSchema`.
        Code: parsed.data.code,
        Name: parsed.data.name,
        Description: parsed.data.description || null,
        ClientName: parsed.data.clientName || null,
        ClientEmail: parsed.data.clientEmail || null,
        StartDate: parsed.data.startDate || null,
        EndDate: parsed.data.endDate || null,
        MaxDailyHours: parsed.data.maxDailyHours ?? null,
      },
      accessToken
    );

    return NextResponse.json<ProjectResponsePayload>({ project: mapProject(dto) }, { status: 201 });
  } catch (error) {
    logger.error('Create project failed', error);
    const details = getBackendErrorDetails(error, 'Could not create the project.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
