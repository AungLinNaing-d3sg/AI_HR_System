import 'server-only';

import type { ExchangeRateCurrencyRefDto, ExchangeRateDto } from '@/types/api.types';
import type { ExchangeRate, ExchangeRateCurrencyRef } from '@/types/domain.types';

function mapCurrencyRef(dto: ExchangeRateCurrencyRefDto): ExchangeRateCurrencyRef {
  return {
    id: dto.Id,
    code: dto.Code,
    symbol: dto.Symbol,
  };
}

/** Maps the backend's PascalCase ExchangeRate DTO to the app's camelCase domain model. */
export function mapExchangeRate(dto: ExchangeRateDto): ExchangeRate {
  return {
    id: dto.Id,
    fromCurrency: mapCurrencyRef(dto.FromCurrency),
    toCurrency: mapCurrencyRef(dto.ToCurrency),
    rate: dto.Rate,
    effectiveDate: dto.EffectiveDate,
    isActive: dto.IsActive,
  };
}

export function mapExchangeRateList(dtos: ExchangeRateDto[]): ExchangeRate[] {
  return dtos.map(mapExchangeRate);
}
