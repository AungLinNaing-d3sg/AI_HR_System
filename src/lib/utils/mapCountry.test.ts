import { mapCountry, mapCountryList } from './mapCountry';
import type { CountryDto } from '@/types/api.types';

const dto: CountryDto = {
  Id: '22222222-2222-2222-2222-222222222201',
  Code: 'SG',
  Name: 'Singapore',
  CreatedAt: '2026-06-11T10:14:31Z',
};

describe('mapCountry', () => {
  it('maps every PascalCase field to its camelCase domain equivalent', () => {
    expect(mapCountry(dto)).toEqual({
      id: '22222222-2222-2222-2222-222222222201',
      code: 'SG',
      name: 'Singapore',
    });
  });
});

describe('mapCountryList', () => {
  it('maps an array of DTOs', () => {
    const result = mapCountryList([dto, { ...dto, Id: 'country-2', Code: 'US', Name: 'United States' }]);
    expect(result).toHaveLength(2);
    expect(result[1].code).toBe('US');
  });

  it('returns an empty array for an empty list', () => {
    expect(mapCountryList([])).toEqual([]);
  });
});
