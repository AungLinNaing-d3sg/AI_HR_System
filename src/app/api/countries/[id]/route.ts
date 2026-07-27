import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as countriesBackend from '@/lib/api/countriesBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapCountry } from '@/lib/utils/mapCountry';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { updateCountrySchema } from '@/lib/validators/country.validators';
import type { CountryResponsePayload } from '@/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Both handlers below are `[SystemAdmin]`-only, mirroring `POST
 * /api/countries` (see that route's comment) - mutating a country affects
 * user assignment and rate card calculations system-wide.
 */

/**
 * PUT /api/countries/:id
 *
 * Updates an existing country's name. The backend's `UpdateCountry`
 * endpoint does not accept `Code` (see docs/HR_System_BE.postman_collection.json)
 * - it is fixed at creation time - so this only ever forwards `Name`.
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
    return NextResponse.json({ message: 'Only a System Admin can update countries.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = updateCountrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await countriesBackend.updateCountry(id, { Name: parsed.data.name }, accessToken);

    return NextResponse.json<CountryResponsePayload>({ country: mapCountry(dto) }, { status: 200 });
  } catch (error) {
    logger.error('Update country failed', error);
    const details = getBackendErrorDetails(error, 'Could not update the country.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * DELETE /api/countries/:id
 *
 * Soft-deletes a country.
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
    return NextResponse.json({ message: 'Only a System Admin can delete countries.' }, { status: 403 });
  }

  try {
    await countriesBackend.deleteCountry(id, accessToken);
    return NextResponse.json({ success: true, message: 'Country deleted successfully.' }, { status: 200 });
  } catch (error) {
    logger.error('Delete country failed', error);
    const details = getBackendErrorDetails(error, 'Could not delete the country.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
