import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as timesheetsBackend from '@/lib/api/timesheetsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, extractUserId, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { getProjectAdminAssignedProjectIds } from '@/lib/utils/timesheetAccess';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { updateTimesheetEntrySchema } from '@/lib/validators/timesheet.validators';
import type { TimesheetEntryUpdateResponsePayload } from '@/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/timesheets/entries/:id
 *
 * Updates the Hours/TaskDescription of an existing entry from the weekly
 * grid - including one that is already approved: per the latest
 * `UpdateTimesheetEntry` contract (see
 * docs/HR_System_BE.postman_collection.json), editing an approved entry is
 * now allowed and the backend itself resets it to "Pending Approval"
 * (`IsApproved: false`), requiring a Project Admin to re-approve it - the
 * backend still independently rejects edits to a period-locked entry.
 *
 * `UpdateTimesheetEntry` is tagged only `[Auth]` with no ownership check
 * documented, so - mirroring this same route's `DELETE` handler below - this
 * route fetches the entry first and only allows the entry's own owner to
 * edit it, closing an otherwise-open IDOR (any authenticated user could
 * otherwise edit any entry by guessing/enumerating its id).
 */
export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  const userId = extractUserId(claims);
  if (!userId) {
    return NextResponse.json({ message: 'Could not identify the current user.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = updateTimesheetEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const entry = await timesheetsBackend.getTimesheetEntryById(id, accessToken);
    if (entry.UserId !== userId) {
      return NextResponse.json({ message: 'You can only edit your own timesheet entries.' }, { status: 403 });
    }

    const taskDescription = parsed.data.taskDescription || null;
    await timesheetsBackend.updateTimesheetEntry(id, { Hours: parsed.data.hours, TaskDescription: taskDescription }, accessToken);

    // `UpdateTimesheetEntry` returns no entry fields on success (see
    // `UpdateTimesheetEntryResponse` in api.types.ts), so the response here
    // echoes back what the caller already sent rather than a backend value.
    // The entry is always Pending Approval after an edit (see doc comment
    // above), regardless of what it was before, so that is reported too.
    return NextResponse.json<TimesheetEntryUpdateResponsePayload>(
      { entry: { id, hours: parsed.data.hours, taskDescription, isApproved: false } },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Update timesheet entry failed', error);
    const details = getBackendErrorDetails(error, 'Could not update this timesheet entry.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * DELETE /api/timesheets/entries/:id
 *
 * Deletes a timesheet entry, completing the entry's CRUD lifecycle alongside
 * `POST /api/timesheets/entries` (create), `GET /api/timesheets/history`
 * (read), and this file's own `PUT` (update). `DeleteTimesheetEntry` is
 * tagged only `[Auth]` in docs/HR_System_BE.postman_collection.json with no
 * ownership check documented - to avoid introducing the same unchecked-IDOR
 * shape already flagged against this route's `PUT` handler, this route
 * fetches the entry first and enforces the same rule the
 * `/timesheets/history` UI already surfaces: a plain `User` may only delete
 * their own entry, `SystemAdmin` may delete any entry, a `ProjectAdmin` may
 * delete any entry belonging to a project they are themselves assigned to
 * ("a Project Admin can only view/manage assigned project timesheets"), and
 * an already-approved entry can never be deleted, regardless of role.
 */
export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  const role = extractRole(claims);
  const userId = extractUserId(claims);
  const isSystemAdmin = role === 'SystemAdmin';
  const isProjectAdmin = role === 'ProjectAdmin';

  try {
    const entry = await timesheetsBackend.getTimesheetEntryById(id, accessToken);

    if (entry.IsApproved) {
      return NextResponse.json({ message: 'Approved timesheet entries cannot be deleted.' }, { status: 409 });
    }

    const isOwnEntry = entry.UserId === userId;
    let canManage = isOwnEntry || isSystemAdmin;
    if (!canManage && isProjectAdmin) {
      const assignedProjectIds = await getProjectAdminAssignedProjectIds(accessToken);
      canManage = assignedProjectIds.has(entry.ProjectId);
    }

    if (!canManage) {
      return NextResponse.json(
        { message: 'You can only delete your own timesheet entries.' },
        { status: 403 }
      );
    }

    await timesheetsBackend.deleteTimesheetEntry(id, accessToken);
    return NextResponse.json({ success: true, message: 'Timesheet entry deleted successfully.' }, { status: 200 });
  } catch (error) {
    logger.error('Delete timesheet entry failed', error);
    const details = getBackendErrorDetails(error, 'Could not delete this timesheet entry.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
