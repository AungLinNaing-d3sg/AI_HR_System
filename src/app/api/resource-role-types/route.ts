import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as resourceRoleTypesBackend from '@/lib/api/resourceRoleTypesBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapResourceRoleTypeList } from '@/lib/utils/mapProjectAssignment';
import type { ResourceRoleTypeListResponsePayload } from '@/types/api.types';

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
