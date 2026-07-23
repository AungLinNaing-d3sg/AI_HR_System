import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as rateCardsBackend from '@/lib/api/rateCardsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { updateRateCardSchema } from '@/lib/validators/rateCard.validators';
import type { RateCardMutationResponsePayload } from '@/types/api.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Both handlers below are `[SystemAdmin]`-only, mirroring `POST
 * /api/rate-cards` (see that route's comment) - mutating a rate card
 * affects cost and invoice billing calculations system-wide.
 */

/**
 * PUT /api/rate-cards/:id
 *
 * Updates an existing rate card's hourly rate, billing rate, effective
 * date, and active status. The backend's `UpdateRateCard` endpoint does not
 * accept `CountryId`/`ResourceRoleTypeId`/`CurrencyId` (see
 * docs/HR_System_BE.postman_collection.json) - the country/role/currency
 * are fixed at creation time - so this only ever forwards
 * `HourlyRate`/`BillingRate`/`EffectiveDate`/`IsActive`.
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
    return NextResponse.json({ message: 'Only a System Admin can update rate cards.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = updateRateCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await rateCardsBackend.updateRateCard(
      id,
      {
        HourlyRate: parsed.data.hourlyRate,
        BillingRate: parsed.data.billingRate,
        EffectiveDate: parsed.data.effectiveDate,
        IsActive: parsed.data.isActive,
      },
      accessToken
    );

    return NextResponse.json<RateCardMutationResponsePayload>(
      {
        rateCard: {
          id: dto.Id,
          countryId: dto.CountryId,
          resourceRoleTypeId: dto.ResourceRoleTypeId,
          currencyId: dto.CurrencyId,
          hourlyRate: dto.HourlyRate,
          billingRate: dto.BillingRate,
          effectiveDate: dto.EffectiveDate,
          isActive: dto.IsActive,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Update rate card failed', error);
    const details = getBackendErrorDetails(error, 'Could not update the rate card.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * DELETE /api/rate-cards/:id
 *
 * Soft-deletes a rate card.
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
    return NextResponse.json({ message: 'Only a System Admin can delete rate cards.' }, { status: 403 });
  }

  try {
    await rateCardsBackend.deleteRateCard(id, accessToken);
    return NextResponse.json({ success: true, message: 'Rate card deleted successfully.' }, { status: 200 });
  } catch (error) {
    logger.error('Delete rate card failed', error);
    const details = getBackendErrorDetails(error, 'Could not delete the rate card.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
