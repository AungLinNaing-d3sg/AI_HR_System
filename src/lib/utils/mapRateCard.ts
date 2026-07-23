import 'server-only';

import type {
  RateCardCountryRefDto,
  RateCardCurrencyRefDto,
  RateCardDto,
  RateCardResourceRoleTypeRefDto,
} from '@/types/api.types';
import type { RateCard, RateCardCountryRef, RateCardCurrencyRef, RateCardResourceRoleTypeRef } from '@/types/domain.types';

function mapCountryRef(dto: RateCardCountryRefDto): RateCardCountryRef {
  return {
    id: dto.Id,
    code: dto.Code,
    name: dto.Name,
  };
}

function mapResourceRoleTypeRef(dto: RateCardResourceRoleTypeRefDto): RateCardResourceRoleTypeRef {
  return {
    id: dto.Id,
    name: dto.Name,
  };
}

function mapCurrencyRef(dto: RateCardCurrencyRefDto): RateCardCurrencyRef {
  return {
    id: dto.Id,
    code: dto.Code,
    symbol: dto.Symbol,
  };
}

/** Maps the backend's PascalCase RateCard DTO to the app's camelCase domain model. */
export function mapRateCard(dto: RateCardDto): RateCard {
  return {
    id: dto.Id,
    country: mapCountryRef(dto.Country),
    resourceRoleType: mapResourceRoleTypeRef(dto.ResourceRoleType),
    currency: mapCurrencyRef(dto.Currency),
    hourlyRate: dto.HourlyRate,
    billingRate: dto.BillingRate,
    effectiveDate: dto.EffectiveDate,
    isActive: dto.IsActive,
  };
}

export function mapRateCardList(dtos: RateCardDto[]): RateCard[] {
  return dtos.map(mapRateCard);
}
