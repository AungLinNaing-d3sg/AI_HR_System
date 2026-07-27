import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as currenciesBackend from '@/lib/api/currenciesBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapCurrency } from '@/lib/utils/mapCurrency';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { updateCurrencySchema } from '@/lib/validators/currency.validators';
import type { CurrencyResponsePayload } from '@/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Both handlers below are `[SystemAdmin]`-only, mirroring `POST
 * /api/currencies` (see that route's comment) - mutating a currency affects
 * invoicing and rate card calculations system-wide.
 */

/**
 * PUT /api/currencies/:id
 *
 * Updates an existing currency's name, symbol, and active status. The
 * backend's `UpdateCurrency` endpoint does not accept `Code`/`IsBaseCurrency`
 * (see docs/HR_System_BE.postman_collection.json) - both are fixed at
 * creation time - so this only ever forwards `Name`/`Symbol`/`IsActive`.
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
    return NextResponse.json({ message: 'Only a System Admin can update currencies.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = updateCurrencySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await currenciesBackend.updateCurrency(
      id,
      {
        Name: parsed.data.name,
        Symbol: parsed.data.symbol,
        IsActive: parsed.data.isActive,
      },
      accessToken
    );

    return NextResponse.json<CurrencyResponsePayload>({ currency: mapCurrency(dto) }, { status: 200 });
  } catch (error) {
    logger.error('Update currency failed', error);
    const details = getBackendErrorDetails(error, 'Could not update the currency.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * DELETE /api/currencies/:id
 *
 * Soft-deletes a currency.
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
    return NextResponse.json({ message: 'Only a System Admin can delete currencies.' }, { status: 403 });
  }

  try {
    await currenciesBackend.deleteCurrency(id, accessToken);
    return NextResponse.json({ success: true, message: 'Currency deleted successfully.' }, { status: 200 });
  } catch (error) {
    logger.error('Delete currency failed', error);
    const details = getBackendErrorDetails(error, 'Could not delete the currency.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
