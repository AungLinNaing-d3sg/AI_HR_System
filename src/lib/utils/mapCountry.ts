import 'server-only';

import type { CountryDto } from '@/types/api.types';
import type { Country } from '@/types/domain.types';

/** Maps the backend's PascalCase Country DTO to the app's camelCase domain model. */
export function mapCountry(dto: CountryDto): Country {
  return {
    id: dto.Id,
    code: dto.Code,
    name: dto.Name,
  };
}

export function mapCountryList(dtos: CountryDto[]): Country[] {
  return dtos.map(mapCountry);
}
