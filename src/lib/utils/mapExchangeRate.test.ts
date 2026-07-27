import { mapExchangeRate, mapExchangeRateList } from './mapExchangeRate';
import type { ExchangeRateDto } from '@/types/api.types';

const dto: ExchangeRateDto = {
  Id: 'rate-1',
  FromCurrency: { Id: 'currency-1', Code: 'SGD', Symbol: 'S$' },
  ToCurrency: { Id: 'currency-2', Code: 'USD', Symbol: '$' },
  Rate: 0.74,
  EffectiveDate: '2025-01-01',
  IsActive: true,
  CreatedAt: '2026-06-22T12:44:02Z',
};

describe('mapExchangeRate', () => {
  it('maps every PascalCase field to its camelCase domain equivalent', () => {
    expect(mapExchangeRate(dto)).toEqual({
      id: 'rate-1',
      fromCurrency: { id: 'currency-1', code: 'SGD', symbol: 'S$' },
      toCurrency: { id: 'currency-2', code: 'USD', symbol: '$' },
      rate: 0.74,
      effectiveDate: '2025-01-01',
      isActive: true,
    });
  });
});

describe('mapExchangeRateList', () => {
  it('maps an array of DTOs', () => {
    const result = mapExchangeRateList([
      dto,
      { ...dto, Id: 'rate-2', ToCurrency: { Id: 'currency-3', Code: 'INR', Symbol: '₹' }, Rate: 62.5 },
    ]);
    expect(result).toHaveLength(2);
    expect(result[1].toCurrency.code).toBe('INR');
  });

  it('returns an empty array for an empty list', () => {
    expect(mapExchangeRateList([])).toEqual([]);
  });
});
