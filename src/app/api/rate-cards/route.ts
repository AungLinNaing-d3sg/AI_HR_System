import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as rateCardsBackend from '@/lib/api/rateCardsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapRateCardList } from '@/lib/utils/mapRateCard';
import { resolvePagination } from '@/lib/utils/pagination';
import { pickSearchParams } from '@/lib/utils/searchParams';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { createRateCardSchema } from '@/lib/validators/rateCard.validators';
import type { RateCardListResponsePayload, RateCardMutationResponsePayload } from '@/types/api.types';

/**
 * GET /api/rate-cards?pageNo=&pageSize=&countryId=
 *
 * Lists rate cards, backing both the `/admin/rate-cards` country summary
 * cards (an unpaginated call) and its own paginated Country/Role/Daily Rate
 * table (a paginated call additionally scoped to the selected `countryId`
 * filter - see `RateCardsTable`). Open to any authenticated user, matching
 * `GET /api/currencies`/`GET /api/exchange-rates` (reference data used for
 * cost and invoice billing calculations - no sensitive information). `POST`
 * below is `SystemAdmin`-only, since adding a rate card affects cost/billing
 * calculations system-wide - see that handler's comment.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const { pageNo, pageSize } = resolvePagination(searchParams, { pageNo: 1, pageSize: 100 });
  const { countryId } = pickSearchParams(searchParams, ['countryId']);

  try {
    const { Items, TotalCount, Page, PageSize } = await rateCardsBackend.getAllRateCards(accessToken, {
      page: pageNo,
      pageSize,
      countryId,
    });
    return NextResponse.json<RateCardListResponsePayload>(
      { rateCards: mapRateCardList(Items), totalCount: TotalCount, pageNo: Page, pageSize: PageSize },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Get rate cards failed', error);
    const details = getBackendErrorDetails(error, 'Could not load rate cards.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * POST /api/rate-cards
 *
 * Creates a new rate card. `[SystemAdmin]`-only, mirroring `POST
 * /api/currencies`/`POST /api/exchange-rates` (see those routes' comments) -
 * mutating rate cards affects cost and invoice billing calculations
 * system-wide, as defense in depth - the backend remains the real
 * authorization boundary.
 *
 * Unlike Exchange Rate's `FromCurrencyId` (always resolved server-side from
 * the current base currency - see `app/api/exchange-rates/route.ts`),
 * `CountryId`/`ResourceRoleTypeId`/`CurrencyId` here are legitimately
 * user-selected values (which country/role/currency this rate card applies
 * to, chosen from the reference-data dropdowns on `RateCardForm`), so all
 * three are forwarded as-is from the validated request body.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  if (extractRole(claims) !== 'SystemAdmin') {
    return NextResponse.json({ message: 'Only a System Admin can create rate cards.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = createRateCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await rateCardsBackend.createRateCard(
      {
        CountryId: parsed.data.countryId,
        ResourceRoleTypeId: parsed.data.resourceRoleTypeId,
        CurrencyId: parsed.data.currencyId,
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
      { status: 201 }
    );
  } catch (error) {
    logger.error('Create rate card failed', error);
    const details = getBackendErrorDetails(error, 'Could not create the rate card.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
