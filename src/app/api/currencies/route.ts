import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as currenciesBackend from '@/lib/api/currenciesBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapCurrencyList } from '@/lib/utils/mapCurrency';
import type { CurrencyListResponsePayload } from '@/types/api.types';

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
