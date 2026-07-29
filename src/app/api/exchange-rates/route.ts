import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as currenciesBackend from '@/lib/api/currenciesBackend.api';
import * as exchangeRatesBackend from '@/lib/api/exchangeRatesBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapExchangeRateList } from '@/lib/utils/mapExchangeRate';
import { resolvePagination } from '@/lib/utils/pagination';
import { pickSearchParams } from '@/lib/utils/searchParams';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { createExchangeRateSchema } from '@/lib/validators/exchangeRate.validators';
import type { ExchangeRateListResponsePayload, ExchangeRateMutationResponsePayload } from '@/types/api.types';

/**
 * GET /api/exchange-rates?pageNo=&pageSize=&fromCurrencyId=
 *
 * Lists exchange rates, backing both the `/admin/exchange-rates` summary
 * cards (an unpaginated call) and its own paginated From/To/Rate table (a
 * paginated call additionally scoped to `fromCurrencyId` - see
 * `ExchangeRatesTable`, which only ever lists rates FROM the base currency).
 * Open to any authenticated user, matching `GET /api/currencies` (reference
 * data used to convert invoice totals - no sensitive information). `POST`
 * below is `SystemAdmin`-only, since adding a rate affects invoicing
 * system-wide - see that handler's comment.
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
  const { fromCurrencyId } = pickSearchParams(searchParams, ['fromCurrencyId']);

  try {
    const { Items, TotalCount, Page, PageSize } = await exchangeRatesBackend.getAllExchangeRates(accessToken, {
      page: pageNo,
      pageSize,
      fromCurrencyId,
    });
    return NextResponse.json<ExchangeRateListResponsePayload>(
      { exchangeRates: mapExchangeRateList(Items), totalCount: TotalCount, pageNo: Page, pageSize: PageSize },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Get exchange rates failed', error);
    const details = getBackendErrorDetails(error, 'Could not load exchange rates.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * POST /api/exchange-rates
 *
 * Creates a new exchange rate. `[SystemAdmin]`-only: mutating exchange rates
 * affects invoice currency conversion system-wide, mirroring the
 * `POST /api/currencies` SystemAdmin-only pattern (see that route's
 * comment) as defense in depth - the backend remains the real authorization
 * boundary.
 *
 * `FromCurrencyId` is never accepted from the client (see
 * `createExchangeRateSchema`'s comment): the app's UI only ever defines
 * rates FROM the current base currency (`docs/HR_System_FE_wireframe.pdf`'s
 * `/admin/exchange-rates`), so the base currency is looked up here from the
 * Currency domain and used as the source of truth, rather than trusting
 * whatever id a client request might send.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  if (extractRole(claims) !== 'SystemAdmin') {
    return NextResponse.json({ message: 'Only a System Admin can create exchange rates.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = createExchangeRateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const { Items } = await currenciesBackend.getAllCurrencies(accessToken);
    const baseCurrency = Items.find((currency) => currency.IsBaseCurrency);

    if (!baseCurrency) {
      return NextResponse.json(
        { message: 'No base currency is configured. Set a base currency on Currencies before adding exchange rates.' },
        { status: 409 }
      );
    }

    if (parsed.data.toCurrencyId === baseCurrency.Id) {
      return NextResponse.json(
        {
          message: 'Target currency must be different from the base currency.',
          errors: { toCurrencyId: ['Target currency must be different from the base currency.'] },
        },
        { status: 400 }
      );
    }

    const dto = await exchangeRatesBackend.createExchangeRate(
      {
        FromCurrencyId: baseCurrency.Id,
        ToCurrencyId: parsed.data.toCurrencyId,
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
      { status: 201 }
    );
  } catch (error) {
    logger.error('Create exchange rate failed', error);
    const details = getBackendErrorDetails(error, 'Could not create the exchange rate.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
