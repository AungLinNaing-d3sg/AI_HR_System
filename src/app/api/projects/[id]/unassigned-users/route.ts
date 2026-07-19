import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as projectsBackend from '@/lib/api/projectsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import type { ProjectAssignmentDto, UnassignedUsersResponsePayload } from '@/types/api.types';
import type { UnassignedUser } from '@/types/domain.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/:id/unassigned-users
 *
 * Candidate users for the "unassigned users" dropdown on
 * `/projects/:id/assignments` (`docs/HR_System_FE_wireframe.pdf`). There is
 * no backend endpoint that lists every user in the system (the `/Auth/*`
 * and `/Project/*` folders of docs/HR_System_BE.postman_collection.json
 * were audited for one and none exists), so this derives a "known users"
 * directory from every project's `GetProjectAssignments` response and
 * subtracts whoever is already assigned to *this* project. A user who has
 * never been assigned to any project will not appear here - that's a real
 * limitation of this approach, not a bug, and should be revisited if the
 * backend ever adds a genuine user-list endpoint.
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
    const projectDtos = await projectsBackend.getProjectList(accessToken);
    const assignmentsByProject = await Promise.all(
      projectDtos.map((project) => projectsBackend.getProjectAssignments(project.Id, accessToken))
    );

    const knownUsers = new Map<string, ProjectAssignmentDto>();
    for (const assignments of assignmentsByProject) {
      for (const assignment of assignments) {
        knownUsers.set(assignment.UserId, assignment);
      }
    }

    const currentProjectIndex = projectDtos.findIndex((project) => project.Id === id);
    const assignedUserIds = new Set(
      (currentProjectIndex === -1 ? [] : assignmentsByProject[currentProjectIndex]).map(
        (assignment) => assignment.UserId
      )
    );

    const users: UnassignedUser[] = Array.from(knownUsers.values())
      .filter((assignment) => !assignedUserIds.has(assignment.UserId))
      .map((assignment) => ({
        userId: assignment.UserId,
        firstName: assignment.FirstName,
        lastName: assignment.LastName,
        email: assignment.Email,
      }));

    return NextResponse.json<UnassignedUsersResponsePayload>({ users }, { status: 200 });
  } catch (error) {
    logger.error('Get unassigned users failed', error);
    const details = getBackendErrorDetails(error, 'Could not load candidate users.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
