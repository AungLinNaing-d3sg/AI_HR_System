import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as countriesBackend from '@/lib/api/countriesBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapCountryList } from '@/lib/utils/mapCountry';
import type { CountryListResponsePayload } from '@/types/api.types';

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
