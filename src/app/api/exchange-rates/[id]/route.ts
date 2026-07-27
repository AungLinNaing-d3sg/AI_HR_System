import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as exchangeRatesBackend from '@/lib/api/exchangeRatesBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { updateExchangeRateSchema } from '@/lib/validators/exchangeRate.validators';
import type { ExchangeRateMutationResponsePayload } from '@/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Both handlers below are `[SystemAdmin]`-only, mirroring `POST
 * /api/exchange-rates` (see that route's comment) - mutating an exchange
 * rate affects invoice currency conversion system-wide.
 */

/**
 * PUT /api/exchange-rates/:id
 *
 * Updates an existing exchange rate's rate, effective date, and active
 * status. The backend's `UpdateExchangeRate` endpoint does not accept
 * `FromCurrencyId`/`ToCurrencyId` (see docs/HR_System_BE.postman_collection.json)
 * - the currency pair is fixed at creation time - so this only ever
 * forwards `Rate`/`EffectiveDate`/`IsActive`.
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
    return NextResponse.json({ message: 'Only a System Admin can update exchange rates.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = updateExchangeRateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await exchangeRatesBackend.updateExchangeRate(
      id,
      {
        Rate: parsed.data.rate,
        EffectiveDate: parsed.data.effectiveDate,
        IsActive: parsed.data.isActive,
      },
      accessToken
    );

    return NextResponse.json<ExchangeRateMutationResponsePayload>(
      {
        exchangeRate: {
          id: dto.Id,
          fromCurrencyId: dto.FromCurrencyId,
          toCurrencyId: dto.ToCurrencyId,
          rate: dto.Rate,
          effectiveDate: dto.EffectiveDate,
          isActive: dto.IsActive,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Update exchange rate failed', error);
    const details = getBackendErrorDetails(error, 'Could not update the exchange rate.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * DELETE /api/exchange-rates/:id
 *
 * Soft-deletes an exchange rate.
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
    return NextResponse.json({ message: 'Only a System Admin can delete exchange rates.' }, { status: 403 });
  }

  try {
    await exchangeRatesBackend.deleteExchangeRate(id, accessToken);
    return NextResponse.json({ success: true, message: 'Exchange rate deleted successfully.' }, { status: 200 });
  } catch (error) {
    logger.error('Delete exchange rate failed', error);
    const details = getBackendErrorDetails(error, 'Could not delete the exchange rate.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
