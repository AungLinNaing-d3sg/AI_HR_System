import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as resourceRoleTypesBackend from '@/lib/api/resourceRoleTypesBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapResourceRoleType, mapResourceRoleTypeList } from '@/lib/utils/mapProjectAssignment';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { createResourceRoleTypeSchema } from '@/lib/validators/resourceRoleType.validators';
import type { ResourceRoleTypeListResponsePayload, ResourceRoleTypeResponsePayload } from '@/types/api.types';

/**
 * GET /api/resource-role-types
 *
 * Reference data backing the role dropdown on `/projects/:id/assignments`
 * (`AssignResource` requires a `ResourceRoleTypeId`). Open to any
 * authenticated user, matching the rest of the Projects surface.
 */
export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  try {
    const { Items } = await resourceRoleTypesBackend.getAllResourceRoleTypes(accessToken);
    return NextResponse.json<ResourceRoleTypeListResponsePayload>(
      { roleTypes: mapResourceRoleTypeList(Items) },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Get resource role types failed', error);
    const details = getBackendErrorDetails(error, 'Could not load resource role types.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * POST /api/resource-role-types
 *
 * Creates a new resource role type. `[SystemAdmin]`-only: unlike the
 * read-only `GET` above (open reference data for any authenticated role,
 * needed for the assignment role dropdown), mutating the set of resource
 * role types affects project assignments and rate card calculations
 * system-wide, so this mirrors `/api/countries`/`/api/currencies`'s
 * SystemAdmin-only mutation pattern (see those routes' comments) as defense
 * in depth - the backend remains the real authorization boundary.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  if (extractRole(claims) !== 'SystemAdmin') {
    return NextResponse.json({ message: 'Only a System Admin can create resource role types.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = createResourceRoleTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await resourceRoleTypesBackend.createResourceRoleType(
      { Name: parsed.data.name, Description: parsed.data.description || null },
      accessToken
    );

    return NextResponse.json<ResourceRoleTypeResponsePayload>(
      { roleType: mapResourceRoleType(dto) },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Create resource role type failed', error);
    const details = getBackendErrorDetails(error, 'Could not create the resource role type.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
