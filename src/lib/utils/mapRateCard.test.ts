import { mapRateCard, mapRateCardList } from './mapRateCard';
import type { RateCardDto } from '@/types/api.types';

const dto: RateCardDto = {
  Id: 'rate-card-1',
  Country: { Id: 'country-1', Code: 'SG', Name: 'Singapore' },
  ResourceRoleType: { Id: 'role-1', Name: 'Junior Developer' },
  Currency: { Id: 'currency-1', Code: 'SGD', Symbol: 'S$' },
  HourlyRate: 20,
  BillingRate: 400,
  EffectiveDate: '2025-01-01',
  IsActive: true,
};

describe('mapRateCard', () => {
  it('maps every PascalCase field to its camelCase domain equivalent', () => {
    expect(mapRateCard(dto)).toEqual({
      id: 'rate-card-1',
      country: { id: 'country-1', code: 'SG', name: 'Singapore' },
      resourceRoleType: { id: 'role-1', name: 'Junior Developer' },
      currency: { id: 'currency-1', code: 'SGD', symbol: 'S$' },
      hourlyRate: 20,
      billingRate: 400,
      effectiveDate: '2025-01-01',
      isActive: true,
    });
  });
});

describe('mapRateCardList', () => {
  it('maps an array of DTOs', () => {
    const result = mapRateCardList([
      dto,
      { ...dto, Id: 'rate-card-2', ResourceRoleType: { Id: 'role-2', Name: 'Senior Developer' }, BillingRate: 700 },
    ]);
    expect(result).toHaveLength(2);
    expect(result[1].resourceRoleType.name).toBe('Senior Developer');
  });

  it('returns an empty array for an empty list', () => {
    expect(mapRateCardList([])).toEqual([]);
  });
});
