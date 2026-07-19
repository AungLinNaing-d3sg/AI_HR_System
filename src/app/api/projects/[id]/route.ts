import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as projectsBackend from '@/lib/api/projectsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapProject } from '@/lib/utils/mapProject';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { updateProjectSchema } from '@/lib/validators/project.validators';
import type { ProjectResponsePayload } from '@/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/:id
 *
 * Fetches a single project by GUID. Open to any authenticated user.
 */
export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  try {
    const dto = await projectsBackend.getProject(id, accessToken);
    return NextResponse.json<ProjectResponsePayload>({ project: mapProject(dto) }, { status: 200 });
  } catch (error) {
    logger.error('Get project failed', error);
    const details = getBackendErrorDetails(error, 'Could not load the project.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * PUT /api/projects/:id
 *
 * Updates an existing project. Open to any authenticated user.
 */
export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
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

  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await projectsBackend.updateProject(
      id,
      {
        // `code` is already normalized to uppercase by `updateProjectSchema`.
        Code: parsed.data.code,
        Name: parsed.data.name,
        Description: parsed.data.description || null,
        ClientName: parsed.data.clientName || null,
        ClientEmail: parsed.data.clientEmail || null,
        StartDate: parsed.data.startDate || null,
        EndDate: parsed.data.endDate || null,
        MaxDailyHours: parsed.data.maxDailyHours ?? null,
        IsActive: parsed.data.isActive,
      },
      accessToken
    );

    return NextResponse.json<ProjectResponsePayload>({ project: mapProject(dto) }, { status: 200 });
  } catch (error) {
    logger.error('Update project failed', error);
    const details = getBackendErrorDetails(error, 'Could not update the project.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * DELETE /api/projects/:id
 *
 * Deletes a project. Open to any authenticated user.
 */
export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  try {
    await projectsBackend.deleteProject(id, accessToken);
    return NextResponse.json({ success: true, message: 'Project deleted successfully.' }, { status: 200 });
  } catch (error) {
    logger.error('Delete project failed', error);
    const details = getBackendErrorDetails(error, 'Could not delete the project.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
