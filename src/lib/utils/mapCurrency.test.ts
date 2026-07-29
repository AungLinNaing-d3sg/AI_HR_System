import { mapCurrency, mapCurrencyList } from './mapCurrency';
import type { CurrencyDto } from '@/types/api.types';

const dto: CurrencyDto = {
  Id: 'currency-1',
  Code: 'SGD',
  Name: 'Singapore Dollar',
  Symbol: 'S$',
  IsBaseCurrency: true,
  IsActive: true,
  CreatedAt: '2026-06-11T10:14:31Z',
};

describe('mapCurrency', () => {
  it('maps every PascalCase field to its camelCase domain equivalent', () => {
    expect(mapCurrency(dto)).toEqual({
      id: 'currency-1',
      code: 'SGD',
      name: 'Singapore Dollar',
      symbol: 'S$',
      isBaseCurrency: true,
      isActive: true,
    });
  });
});

describe('mapCurrencyList', () => {
  it('maps an array of DTOs', () => {
    const result = mapCurrencyList([dto, { ...dto, Id: 'currency-2', Code: 'USD', IsBaseCurrency: false }]);
    expect(result).toHaveLength(2);
    expect(result[1].code).toBe('USD');
  });

  it('returns an empty array for an empty list', () => {
    expect(mapCurrencyList([])).toEqual([]);
  });
});
