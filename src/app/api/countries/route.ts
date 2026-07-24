import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as countriesBackend from '@/lib/api/countriesBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapCountry, mapCountryList } from '@/lib/utils/mapCountry';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { createCountrySchema } from '@/lib/validators/country.validators';
import type { CountryListResponsePayload, CountryResponsePayload } from '@/types/api.types';

/**
 * GET /api/countries
 *
 * Reference data backing the optional Country dropdown on the Create User
 * form (`POST /Auth/CreateUser` accepts an optional `CountryId`). Open to
 * any authenticated user, matching `/api/currencies`/`/api/resource-role-types`
 * (country code/name reference data carries no sensitive information).
 */
export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  try {
    const { Items } = await countriesBackend.getAllCountries(accessToken);
    return NextResponse.json<CountryListResponsePayload>({ countries: mapCountryList(Items) }, { status: 200 });
  } catch (error) {
    logger.error('Get countries failed', error);
    const details = getBackendErrorDetails(error, 'Could not load countries.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * POST /api/countries
 *
 * Creates a new country. `[SystemAdmin]`-only: unlike the read-only `GET`
 * above (open reference data for any authenticated role), mutating the set
 * of supported countries affects user assignment and rate card calculations
 * system-wide, so this mirrors `/api/currencies`'s SystemAdmin-only
 * mutation pattern (see that route's comment) as defense in depth - the
 * backend remains the real authorization boundary.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  if (extractRole(claims) !== 'SystemAdmin') {
    return NextResponse.json({ message: 'Only a System Admin can create countries.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = createCountrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await countriesBackend.createCountry(
      // `code` is already normalized to uppercase by `createCountrySchema`.
      { Code: parsed.data.code, Name: parsed.data.name },
      accessToken
    );

    return NextResponse.json<CountryResponsePayload>({ country: mapCountry(dto) }, { status: 201 });
  } catch (error) {
    logger.error('Create country failed', error);
    const details = getBackendErrorDetails(error, 'Could not create the country.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
