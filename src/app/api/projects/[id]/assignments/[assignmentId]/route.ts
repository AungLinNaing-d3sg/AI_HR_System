import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as projectsBackend from '@/lib/api/projectsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';

interface RouteParams {
  params: Promise<{ id: string; assignmentId: string }>;
}

/**
 * DELETE /api/projects/:id/assignments/:assignmentId
 *
 * Removes a resource assignment from a project (see
 * `DELETE /Project/RemoveResource/{projectId}/{assignmentId}`). Open to any
 * authenticated user, matching `/api/projects/:id`.
 */
export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id, assignmentId } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  try {
    await projectsBackend.removeResource(id, assignmentId, accessToken);
    return NextResponse.json({ success: true, message: 'Assignment removed successfully.' }, { status: 200 });
  } catch (error) {
    logger.error('Remove resource failed', error);
    const details = getBackendErrorDetails(error, 'Could not remove this assignment.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
