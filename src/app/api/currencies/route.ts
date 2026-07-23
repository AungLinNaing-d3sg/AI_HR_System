import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as currenciesBackend from '@/lib/api/currenciesBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapCurrency, mapCurrencyList } from '@/lib/utils/mapCurrency';
import { zodErrorToFieldErrors } from '@/lib/utils/zodErrors';
import { createCurrencySchema } from '@/lib/validators/currency.validators';
import type { CurrencyListResponsePayload, CurrencyResponsePayload } from '@/types/api.types';

/**
 * GET /api/currencies
 *
 * Reference data backing the currency dropdown on `/invoices/generate` and
 * the `/invoices/[id]` edit form (`GenerateInvoice`/`UpdateInvoice` both
 * require a `CurrencyId`). Open to any authenticated user, matching
 * `/api/resource-role-types` (currency code/symbol reference data carries no
 * sensitive information).
 */
export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  try {
    const { Items } = await currenciesBackend.getAllCurrencies(accessToken);
    return NextResponse.json<CurrencyListResponsePayload>(
      { currencies: mapCurrencyList(Items) },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Get currencies failed', error);
    const details = getBackendErrorDetails(error, 'Could not load currencies.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}

/**
 * POST /api/currencies
 *
 * Creates a new currency. `[SystemAdmin]`-only: unlike the read-only `GET`
 * above (open reference data for any authenticated role), mutating the set
 * of supported currencies affects invoicing and rate card calculations
 * system-wide, so this mirrors the `/admin/users` management routes'
 * SystemAdmin-only pattern (`app/api/auth/users/route.ts`) as defense in
 * depth - the backend remains the real authorization boundary.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  if (extractRole(claims) !== 'SystemAdmin') {
    return NextResponse.json({ message: 'Only a System Admin can create currencies.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = createCurrencySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Please check the highlighted fields.', errors: zodErrorToFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const dto = await currenciesBackend.createCurrency(
      {
        // `code` is already normalized to uppercase by `createCurrencySchema`.
        Code: parsed.data.code,
        Name: parsed.data.name,
        Symbol: parsed.data.symbol,
        IsBaseCurrency: parsed.data.isBaseCurrency,
        IsActive: parsed.data.isActive,
      },
      accessToken
    );

    return NextResponse.json<CurrencyResponsePayload>({ currency: mapCurrency(dto) }, { status: 201 });
  } catch (error) {
    logger.error('Create currency failed', error);
    const details = getBackendErrorDetails(error, 'Could not create the currency.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
