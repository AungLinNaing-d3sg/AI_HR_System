import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as timesheetsBackend from '@/lib/api/timesheetsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import type { ApproveTimesheetEntryResponsePayload } from '@/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/timesheets/entries/:id/approve
 *
 * Approves a timesheet entry from the `/timesheets/history` table.
 * `ApproveTimesheetEntry` is tagged only `[Auth]` in
 * docs/HR_System_BE.postman_collection.json (no backend-enforced role), so
 * this is a frontend UX-level gate - same `PROJECT_MANAGEMENT_ROLES` used to
 * gate `/projects` - restricting the action to managers reviewing their
 * team's hours rather than every authenticated user.
 */
export async function PUT(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) {
    return NextResponse.json({ message: 'Only a manager can approve timesheet entries.' }, { status: 403 });
  }

  try {
    const dto = await timesheetsBackend.approveTimesheetEntry(id, accessToken);

    return NextResponse.json<ApproveTimesheetEntryResponsePayload>(
      { id: dto.Id, isApproved: dto.IsApproved, approvedAt: dto.ApprovedAt },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Approve timesheet entry failed', error);
    const details = getBackendErrorDetails(error, 'Could not approve this timesheet entry.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
