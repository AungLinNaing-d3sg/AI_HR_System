import 'server-only';

import type { CurrencyDto } from '@/types/api.types';
import type { Currency } from '@/types/domain.types';

/** Maps the backend's PascalCase Currency DTO to the app's camelCase domain model. */
export function mapCurrency(dto: CurrencyDto): Currency {
  return {
    id: dto.Id,
    code: dto.Code,
    name: dto.Name,
    symbol: dto.Symbol,
    isBaseCurrency: dto.IsBaseCurrency,
    isActive: dto.IsActive,
  };
}

export function mapCurrencyList(dtos: CurrencyDto[]): Currency[] {
  return dtos.map(mapCurrency);
}
