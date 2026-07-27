import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as resourceRoleTypesBackend from '@/lib/api/resourceRoleTypesBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapResourceRoleType } from '@/lib/utils/mapProjectAssignment';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { updateResourceRoleTypeSchema } from '@/lib/validators/resourceRoleType.validators';
import type { ResourceRoleTypeResponsePayload } from '@/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Both handlers below are `[SystemAdmin]`-only, mirroring `POST
 * /api/resource-role-types` (see that route's comment) - mutating a resource
 * role type affects project assignments and rate card calculations
 * system-wide.
 */

/**
 * PUT /api/resource-role-types/:id
 *
 * Updates an existing resource role type's name and description.
 */
export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  if (extractRole(claims) !== 'SystemAdmin') {
    return NextResponse.json({ message: 'Only a System Admin can update resource role types.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = updateResourceRoleTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await resourceRoleTypesBackend.updateResourceRoleType(
      id,
      { Name: parsed.data.name, Description: parsed.data.description || null },
      accessToken
    );

    return NextResponse.json<ResourceRoleTypeResponsePayload>(
      { roleType: mapResourceRoleType(dto) },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Update resource role type failed', error);
    const details = getBackendErrorDetails(error, 'Could not update the resource role type.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * DELETE /api/resource-role-types/:id
 *
 * Soft-deletes a resource role type.
 */
export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  if (extractRole(claims) !== 'SystemAdmin') {
    return NextResponse.json({ message: 'Only a System Admin can delete resource role types.' }, { status: 403 });
  }

  try {
    await resourceRoleTypesBackend.deleteResourceRoleType(id, accessToken);
    return NextResponse.json({ success: true, message: 'Resource role type deleted successfully.' }, { status: 200 });
  } catch (error) {
    logger.error('Delete resource role type failed', error);
    const details = getBackendErrorDetails(error, 'Could not delete the resource role type.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
