import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as projectsBackend from '@/lib/api/projectsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapProjectAssignmentList } from '@/lib/utils/mapProjectAssignment';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { assignResourceSchema } from '@/lib/validators/project.validators';
import type { ProjectAssignmentListResponsePayload } from '@/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function checkAuth(accessToken: string | undefined, claims: ReturnType<typeof decodeAccessToken>) {
  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }
  return null;
}

/**
 * GET /api/projects/:id/assignments
 *
 * Lists the resources currently assigned to a project (see
 * `docs/HR_System_FE_wireframe.pdf`'s `/projects/:id/assignments` screen).
 * Open to any authenticated user, matching `/api/projects/:id`.
 */
export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  const authError = checkAuth(accessToken, claims);
  if (authError) return authError;

  try {
    const dtos = await projectsBackend.getProjectAssignments(id, accessToken as string);
    return NextResponse.json<ProjectAssignmentListResponsePayload>(
      { assignments: mapProjectAssignmentList(dtos) },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Get project assignments failed', error);
    const details = getBackendErrorDetails(error, 'Could not load this project’s assignments.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * POST /api/projects/:id/assignments
 *
 * Assigns a user resource to the project with a specific role type (see
 * `POST /Project/AssignResource/{projectId}`). Open to any authenticated
 * user.
 */
export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  const authError = checkAuth(accessToken, claims);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = assignResourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    await projectsBackend.assignResource(
      id,
      { UserId: parsed.data.userId, ResourceRoleTypeId: parsed.data.resourceRoleTypeId },
      accessToken as string
    );

    const dtos = await projectsBackend.getProjectAssignments(id, accessToken as string);
    return NextResponse.json<ProjectAssignmentListResponsePayload>(
      { assignments: mapProjectAssignmentList(dtos) },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Assign resource failed', error);
    const details = getBackendErrorDetails(error, 'Could not assign this user to the project.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
